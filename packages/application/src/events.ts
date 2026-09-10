import type { DomainEvent, PlayerId } from "@shadow-council/domain";

export type RoomApplicationEvent =
  | { readonly type: "RoomCreated"; readonly roomCode: string; readonly hostPlayerId: PlayerId }
  | {
      readonly type: "PlayerJoined";
      readonly roomCode: string;
      readonly playerId: PlayerId;
      readonly displayName: string;
    }
  | { readonly type: "PlayerLeft"; readonly roomCode: string; readonly playerId: PlayerId }
  | { readonly type: "HostChanged"; readonly roomCode: string; readonly hostPlayerId: PlayerId };

export type ApplicationDomainEvent =
  | Exclude<DomainEvent, { type: "PowerRecovered" | "AttackResolved" }>
  | (Omit<Extract<DomainEvent, { type: "PowerRecovered" }>, "power"> & { readonly power?: number })
  | (Omit<Extract<DomainEvent, { type: "AttackResolved" }>, "attackerPower" | "targetPower"> & {
      readonly attackerPower?: number;
      readonly targetPower?: number;
    });

export type ApplicationEvent = ApplicationDomainEvent | RoomApplicationEvent;
