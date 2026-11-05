declare module 'polylabel' {
  export interface PolylabelResult extends Array<number> {
    0: number;
    1: number;
    distance: number;
  }

  export default function polylabel(
    polygon: number[][][],
    precision?: number,
    debug?: boolean
  ): PolylabelResult;
}
