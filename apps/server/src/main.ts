import {
  GameApplication,
  MemoryMatchStore,
  MemoryMembershipStore,
  MemoryRoomStore,
} from "@shadow-council/application";
import { createHttpServer } from "./transport/http-server.js";
import {
  NodeClock,
  NodeCredentialGenerator,
  NodeIdentityGenerator,
  NodeScheduler,
} from "./adapters/node-adapters.js";

export const createServerApplication = (): GameApplication =>
  new GameApplication({
    rooms: new MemoryRoomStore(),
    matches: new MemoryMatchStore(),
    memberships: new MemoryMembershipStore(),
    credentials: new NodeCredentialGenerator(),
    identities: new NodeIdentityGenerator(),
    clock: new NodeClock(),
    scheduler: new NodeScheduler(),
  });

export const createApplicationServer = () => createHttpServer(createServerApplication());

if (process.argv[1]?.endsWith("main.js")) {
  const port = Number(process.env.PORT ?? "3000");
  createApplicationServer().listen(port, () => {
    process.stdout.write(`Shadow Council server listening on http://localhost:${port}\n`);
  });
}
