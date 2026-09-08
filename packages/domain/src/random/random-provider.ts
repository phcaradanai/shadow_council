import type { RandomState } from "../model.js";

export interface RandomDraw {
  readonly value: number;
  readonly nextState: RandomState;
}

export interface RandomProvider {
  readonly algorithmVersion?: string;
  readonly initialize?: (seed: string) => RandomState;
  readonly nextInt: (state: RandomState, exclusiveMax: number) => RandomDraw;
}
