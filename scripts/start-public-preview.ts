process.env.PUBLIC_PREVIEW ??= "1";
process.env.SERVE_CLIENT ??= "1";

await import("../server/index.js");
