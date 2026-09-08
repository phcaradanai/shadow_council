import type { DomainEvent } from "./events.js";
import type { MatchState } from "./model.js";

export interface Transition {
  readonly state: MatchState;
  readonly events: readonly DomainEvent[];
}
