import { createApplicationServer } from "./apps/server/dist/main.js";

const port = Number(process.env.PORT ?? "3000");
createApplicationServer().listen(port, "0.0.0.0", () => {
  process.stdout.write(`Shadow Council server listening on http://0.0.0.0:${port}\n`);
});
