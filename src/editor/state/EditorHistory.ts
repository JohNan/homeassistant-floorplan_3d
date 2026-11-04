import type { FloorplanDocument } from '../../types/floorplan';

export interface HistoryEntry<T> {
  state: T;
  label?: string;
  timestamp: number;
}

/**
 * 50-step immutable deep-clone (`structuredClone`) undo/redo history stack
 * with dirty tracking and ring-buffer overflow pruning.
 */
export class EditorHistory<T = FloorplanDocument> {
  private readonly maxSteps: number;
  private entries: HistoryEntry<T>[] = [];
  private currentIndex = 0;
  private savedIndex: number | null = 0;

  constructor(initialState: T, maxSteps = 50) {
    if (maxSteps < 1) {
      throw new Error('maxSteps must be at least 1');
    }
    this.maxSteps = maxSteps;
    this.reset(initialState);
  }

  /**
   * Returns an immutable deep clone of the current active state.
   */
  get current(): T {
    const entry = this.entries[this.currentIndex];
    return structuredClone(entry.state);
  }

  /**
   * Pushes a new state snapshot to the history stack.
   * Discards any dangling redo branch and trims oldest entries if exceeding maxSteps.
   */
  push(nextState: T, label?: string): void {
    // 1. Discard redo branch
    if (this.currentIndex < this.entries.length - 1) {
      if (this.savedIndex !== null && this.savedIndex > this.currentIndex) {
        // The saved state was in the discarded redo branch
        this.savedIndex = null;
      }
      this.entries = this.entries.slice(0, this.currentIndex + 1);
    }

    // 2. Append new deep cloned snapshot
    this.entries.push({
      state: structuredClone(nextState),
      label,
      timestamp: Date.now()
    });

    // 3. Ring buffer capping: trim oldest entries if length exceeds maxSteps
    if (this.entries.length > this.maxSteps) {
      const overflow = this.entries.length - this.maxSteps;
      this.entries = this.entries.slice(overflow);
      if (this.savedIndex !== null) {
        this.savedIndex -= overflow;
        if (this.savedIndex < 0) {
          // The saved revision has been pushed off the ring buffer
          this.savedIndex = null;
        }
      }
    }

    this.currentIndex = this.entries.length - 1;
  }

  /**
   * Rewinds one step in history. Returns null if at the beginning of history.
   */
  undo(): T | null {
    if (!this.canUndo) {
      return null;
    }
    this.currentIndex--;
    return this.current;
  }

  /**
   * Advances one step forward in history. Returns null if at the latest step.
   */
  redo(): T | null {
    if (!this.canRedo) {
      return null;
    }
    this.currentIndex++;
    return this.current;
  }

  get canUndo(): boolean {
    return this.currentIndex > 0;
  }

  get canRedo(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  /**
   * Marks the current history position as the clean saved revision.
   */
  markSaved(): void {
    this.savedIndex = this.currentIndex;
  }

  /**
   * Returns true if current state differs from the last saved state.
   */
  get isDirty(): boolean {
    return this.savedIndex !== this.currentIndex;
  }

  /**
   * Clears history and resets to a single initial state.
   */
  reset(newState: T): void {
    this.entries = [
      {
        state: structuredClone(newState),
        timestamp: Date.now()
      }
    ];
    this.currentIndex = 0;
    this.savedIndex = 0;
  }

  /**
   * Returns current stack length (for testing / telemetry).
   */
  get length(): number {
    return this.entries.length;
  }

  /**
   * Returns current active index in the stack.
   */
  get index(): number {
    return this.currentIndex;
  }
}
