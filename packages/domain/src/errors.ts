export type RuleErrorCode =
  | "InvalidSetup"
  | "WrongPhase"
  | "NotYourTurn"
  | "InvalidTarget"
  | "InvalidFunding"
  | "InsufficientPower"
  | "PowerAtCap"
  | "InvalidReaction"
  | "StalePhase"
  | "UnknownPlayer";

export interface RuleError {
  readonly code: RuleErrorCode;
  readonly message: string;
}

export const ruleError = (code: RuleErrorCode, message: string): RuleError => ({
  code,
  message,
});
