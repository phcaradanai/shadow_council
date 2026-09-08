export type ApplicationErrorCode =
  | "Unauthenticated"
  | "NotMember"
  | "RoomNotFound"
  | "RoomFull"
  | "AlreadyMember"
  | "InvalidDisplayName"
  | "NotHost"
  | "RoomNotReady"
  | "MatchNotFound"
  | "MatchIdMismatch"
  | "StaleRevision"
  | "StalePhase"
  | "CommandIdConflict"
  | "InvalidIntent"
  | "InvalidCommandId";

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
  }
}

export const applicationError = (code: ApplicationErrorCode, message: string): ApplicationError =>
  new ApplicationError(code, message);
