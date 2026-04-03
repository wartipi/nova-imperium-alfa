import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { backfillTileMetadata } from "./seeds/backfillTileMetadata";
import { ensureUnitsTable } from "./cityService";
import { backfillTerritoryOwnership } from "./territoryService";
import { ensureGameClock, processDueTurns } from "./gameTurnService";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Backfill idempotent : remplit metadata.resources sur les tuiles existantes
  backfillTileMetadata().catch(err =>
    console.error('[backfillMetadata] Erreur non-bloquante:', err)
  );
  ensureUnitsTable().catch(err =>
    console.error('[ensureUnitsTable] Erreur non-bloquante:', err)
  );
  // Backfill idempotent Phase 12 : ajoute l'ownership canonique aux territoires existants
  backfillTerritoryOwnership().catch(err =>
    console.error('[backfillTerritoryOwnership] Erreur non-bloquante:', err)
  );

  // Horloge globale du jeu — init + rattrapage des tours dus
  await ensureGameClock().catch(err =>
    console.error('[GameClock] Erreur init:', err)
  );
  processDueTurns().catch(err =>
    console.error('[GameClock] Erreur rattrapage initial:', err)
  );

  // Scheduler 60s — traite les tours échus sans logique agressive
  setInterval(() => {
    processDueTurns().catch(err =>
      console.error('[GameClock] Erreur scheduler:', err)
    );
  }, 60_000);

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
