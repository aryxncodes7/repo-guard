import express from "express";

let app: any;

try {
  const server = await import("../server");
  app = server.default;
} catch (e: any) {
  // If server.ts crashes on import, create a diagnostic Express app
  // that returns the actual error so we can debug it
  app = express();
  app.use(express.json());
  app.all("*", (_req: any, res: any) => {
    res.status(500).json({
      error: "Server module failed to load",
      message: e?.message || String(e),
      stack: e?.stack?.split("\n").slice(0, 10),
    });
  });
}

export default app;
