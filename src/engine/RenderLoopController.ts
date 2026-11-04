import type { QualityTier } from '../types/floorplan';
import type { ActiveTween, QualityProfile } from './contracts';

/**
 * On-Demand Render Loop Controller (`RenderLoopController`)
 * Enforces strict 0-FPS idle sleep when scene is static to eliminate CPU/GPU drain
 * on wall tablets, and drives smooth cubic ease-out transitions and continuous animations.
 */
export class RenderLoopController {
  private _onRenderFrame: (dtSec: number, nowMs: number) => boolean;
  private _running = false;
  private _rafId: number | null = null;
  private _lastFrameTimeMs = 0;
  private _profile: QualityProfile;
  private _tweens = new Map<string, ActiveTween>();
  private _continuousIds = new Set<string>();

  public dirty = false;

  constructor(
    onRenderFrame: (dtSec: number, nowMs: number) => boolean,
    profile?: QualityProfile
  ) {
    this._onRenderFrame = onRenderFrame;
    this._profile = profile ?? RenderLoopController.resolveQualityProfile('tablet');
    this._onRaf = this._onRaf.bind(this);
  }

  /**
   * Resolves a QualityProfile given a user or auto QualityTier.
   */
  public static resolveQualityProfile(tier: QualityTier): QualityProfile {
    let resolvedTier: 'high' | 'tablet' | 'low';

    if (tier === 'auto') {
      let isHigh = false;
      if (typeof navigator !== 'undefined') {
        const cores = navigator.hardwareConcurrency ?? 4;
        const screenPixels =
          typeof window !== 'undefined'
            ? (window.screen?.width || window.innerWidth || 1024) *
              (window.screen?.height || window.innerHeight || 768)
            : 0;
        // High profile for 8+ cores or large high-res desktop screens
        if (cores >= 8 || screenPixels >= 1920 * 1080) {
          isHigh = true;
        }
      }
      resolvedTier = isHigh ? 'high' : 'tablet';
    } else {
      resolvedTier = tier;
    }

    if (resolvedTier === 'high') {
      return {
        tier: 'high',
        pixelRatio: Math.min(
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
          2.0
        ),
        antialias: true,
        lightmapSize: 512,
        maxPointLights: 8,
        shadowsEnabled: true,
        shadowMapSize: 2048,
        maxFps: 60
      };
    }

    if (resolvedTier === 'tablet') {
      return {
        tier: 'tablet',
        pixelRatio: Math.min(
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
          1.5
        ),
        antialias: true,
        lightmapSize: 512,
        maxPointLights: 4,
        shadowsEnabled: true,
        shadowMapSize: 1024,
        maxFps: 60
      };
    }

    return {
      tier: 'low',
      pixelRatio: 1.0,
      antialias: false,
      lightmapSize: 256,
      maxPointLights: 0,
      shadowsEnabled: false,
      shadowMapSize: 512,
      maxFps: 30
    };
  }

  /**
   * Instance helper for resolving quality profile.
   */
  public resolveQualityProfile(tier: QualityTier): QualityProfile {
    return RenderLoopController.resolveQualityProfile(tier);
  }

  public get profile(): QualityProfile {
    return this._profile;
  }

  public setQualityProfile(profile: QualityProfile): void {
    this._profile = profile;
    this.markDirty();
  }

  /**
   * Returns true when the loop is sleeping at 0 FPS idle.
   */
  public get isIdle(): boolean {
    return (
      !this.dirty &&
      this._tweens.size === 0 &&
      this._continuousIds.size === 0 &&
      this._rafId === null
    );
  }

  /**
   * Number of active tweens currently running.
   */
  public get activeTweenCount(): number {
    return this._tweens.size;
  }

  /**
   * Marks scene dirty and schedules a requestAnimationFrame wakeup if currently sleeping.
   */
  public markDirty(): void {
    this.dirty = true;
    if (this._running && this._rafId === null) {
      this._scheduleFrame();
    }
  }

  /**
   * Adds or replaces an ActiveTween by ID with cubic ease-out interpolation and wakes loop.
   */
  public addTween(tween: ActiveTween): void {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const normalizedTween: ActiveTween = {
      ...tween,
      startTimeMs: tween.startTimeMs > 0 ? tween.startTimeMs : now
    };
    this._tweens.set(normalizedTween.id, normalizedTween);
    this.markDirty();
  }

  /**
   * Cancels and removes an active tween by ID.
   */
  public removeTween(id: string): void {
    this._tweens.delete(id);
  }

  /**
   * Registers or unregisters continuous animations (e.g. active ceiling fan or motion pulse).
   */
  public setContinuousAnimation(id: string, active: boolean): void {
    if (active) {
      this._continuousIds.add(id);
      this.markDirty();
    } else {
      this._continuousIds.delete(id);
    }
  }

  /**
   * Starts the render loop controller.
   */
  public start(): void {
    if (this._running) return;
    this._running = true;
    this._lastFrameTimeMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.markDirty();
  }

  /**
   * Stops the render loop controller and cancels any pending animation frame.
   */
  public stop(): void {
    this._running = false;
    if (this._rafId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this._rafId);
      }
      this._rafId = null;
    }
  }

  /**
   * Synchronous frame evaluation hook for unit tests without waiting on browser requestAnimationFrame.
   */
  public stepManual(nowMs: number): void {
    if (this._rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (!this.dirty && this._tweens.size === 0 && this._continuousIds.size === 0) {
      return;
    }

    const stillActive = this._executeFrame(nowMs);

    const hasWork =
      this.dirty ||
      this._tweens.size > 0 ||
      this._continuousIds.size > 0 ||
      stillActive;

    if (hasWork && this._running) {
      this._scheduleFrame();
    }
  }

  /**
   * Cleans up all resources, tweens, and continuous animations.
   */
  public dispose(): void {
    this.stop();
    this._tweens.clear();
    this._continuousIds.clear();
    this.dirty = false;
  }

  private _scheduleFrame(): void {
    if (!this._running || this._rafId !== null) return;
    if (typeof requestAnimationFrame !== 'undefined') {
      this._rafId = requestAnimationFrame(this._onRaf);
    }
  }

  private _onRaf(nowMs: number): void {
    this._rafId = null;
    if (!this._running) return;

    // Optional frame rate throttling for low tier (30 FPS cap)
    if (this._profile.maxFps < 60 && this._lastFrameTimeMs > 0) {
      const minIntervalMs = 1000 / this._profile.maxFps;
      const elapsed = nowMs - this._lastFrameTimeMs;
      if (elapsed < minIntervalMs - 2) {
        // Reschedule for next tick without evaluating frame
        this._scheduleFrame();
        return;
      }
    }

    const stillActive = this._executeFrame(nowMs);

    // 0-FPS Idle Decision:
    // If scene is not dirty, no tweens remain, no continuous animations active,
    // and onRenderFrame returned false, remain asleep (rafId = null).
    const hasWork =
      this.dirty ||
      this._tweens.size > 0 ||
      this._continuousIds.size > 0 ||
      stillActive;

    if (hasWork && this._running) {
      this._scheduleFrame();
    }
  }

  private _executeFrame(nowMs: number): boolean {
    const dtSec =
      this._lastFrameTimeMs > 0
        ? Math.min((nowMs - this._lastFrameTimeMs) / 1000, 0.1)
        : 0.016;
    this._lastFrameTimeMs = nowMs;

    // 1. Process and interpolate active tweens with cubic ease-out
    if (this._tweens.size > 0) {
      const finishedTweens: ActiveTween[] = [];

      for (const tween of this._tweens.values()) {
        const elapsed = nowMs - tween.startTimeMs;
        const rawT =
          tween.durationMs <= 0
            ? 1.0
            : Math.min(1.0, Math.max(0.0, elapsed / tween.durationMs));

        // Cubic ease-out: 1 - (1 - t)^3
        const progress = 1.0 - Math.pow(1.0 - rawT, 3);

        try {
          tween.onUpdate(progress);
        } catch (err) {
          console.error(`RenderLoopController: tween error (${tween.id}):`, err);
        }

        if (rawT >= 1.0) {
          finishedTweens.push(tween);
        }
      }

      for (const finished of finishedTweens) {
        this._tweens.delete(finished.id);
        try {
          finished.onComplete?.();
        } catch (err) {
          console.error(
            `RenderLoopController: tween onComplete error (${finished.id}):`,
            err
          );
        }
      }
    }

    // 2. Clear dirty flag prior to render invocation so actions in frame can re-mark dirty
    this.dirty = false;

    // 3. Execute scene render frame callback
    let stillActive = false;
    try {
      stillActive = this._onRenderFrame(dtSec, nowMs);
    } catch (err) {
      console.error('RenderLoopController: onRenderFrame error:', err);
    }

    return stillActive;
  }
}
