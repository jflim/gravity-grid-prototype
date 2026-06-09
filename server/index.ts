import { existsSync } from "node:fs";
import { join } from "node:path";
import { Server } from "colyseus";
import express from "express";
import { GravityCanyonRoom } from "./rooms/GravityCanyonRoom.js";
import { resolveServerConfig } from "./serverConfig.js";

const config = resolveServerConfig(process.env);
const clientDistPath = join(process.cwd(), "dist");
const clientIndexPath = join(clientDistPath, "index.html");
const gameServer = new Server({
  express: (app) => {
    app.disable("x-powered-by");
    app.use((_request, response, next) => {
      response.setHeader("X-Content-Type-Options", "nosniff");
      next();
    });

    app.get("/healthz", (_request, response) => {
      response.json({
        ok: true,
        service: "gravity-canyon-server",
        rooms: ["gravity_canyon"],
        publicPreview: config.publicPreview,
      });
    });

    if (config.serveClient) {
      if (!existsSync(clientIndexPath)) {
        console.warn(`Built client not found at ${clientIndexPath}. Run npm run build before serving preview.`);
      }

      app.use(
        express.static(clientDistPath, {
          dotfiles: "deny",
          index: false,
          redirect: false,
        }),
      );
      app.get(/.*/, (_request, response) => {
        response.sendFile(clientIndexPath);
      });
    }
  },
});

gameServer.define("gravity_canyon", GravityCanyonRoom);

await gameServer.listen(config.port, config.host);
console.log(`Gravity Canyon server listening on ws://${config.host}:${config.port}`);
if (config.serveClient) {
  console.log(`Gravity Canyon client preview available at http://${config.host}:${config.port}`);
}
if (config.publicPreview) {
  console.log("Public preview mode is enabled. Share only a trusted tunnel or forwarded URL, and stop this process when done.");
}
