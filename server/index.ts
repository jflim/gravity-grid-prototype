import { Server } from "colyseus";
import { ArchCanyonRoom } from "./rooms/ArchCanyonRoom.js";

const port = Number(process.env.PORT ?? 2567);
const gameServer = new Server({
  express: (app) => {
    app.get("/healthz", (_request, response) => {
      response.json({
        ok: true,
        service: "arch-canyon-server",
        rooms: ["arch_canyon"],
      });
    });
  },
});

gameServer.define("arch_canyon", ArchCanyonRoom);

await gameServer.listen(port, "127.0.0.1");
console.log(`Arch Canyon server listening on ws://127.0.0.1:${port}`);
