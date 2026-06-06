import { Server } from "colyseus";
import { GravityCanyonRoom } from "./rooms/GravityCanyonRoom.js";

const port = Number(process.env.PORT ?? 2567);
const gameServer = new Server({
  express: (app) => {
    app.get("/healthz", (_request, response) => {
      response.json({
        ok: true,
        service: "gravity-canyon-server",
        rooms: ["gravity_canyon"],
      });
    });
  },
});

gameServer.define("gravity_canyon", GravityCanyonRoom);

await gameServer.listen(port, "127.0.0.1");
console.log(`Gravity Canyon server listening on ws://127.0.0.1:${port}`);
