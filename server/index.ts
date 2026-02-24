import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.ts";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

/* -------------------- CORS -------------------- */
function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

/* -------------------- BODY -------------------- */
function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));
}

/* -------------------- LOGGING -------------------- */
function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;
    let capturedJsonResponse: unknown;

    const originalJson = res.json;
    res.json = function (body, ...args) {
      capturedJsonResponse = body;
      return originalJson.apply(this, [body, ...args]);
    };

    res.on("finish", () => {
      if (!reqPath.startsWith("/api")) return;

      const duration = Date.now() - start;
      let line = `${req.method} ${reqPath} ${res.statusCode} ${duration}ms`;

      if (capturedJsonResponse) {
        line += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(line.length > 100 ? line.slice(0, 99) + "…" : line);
    });

    next();
  });
}

/* -------------------- APP NAME -------------------- */
function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

/* -------------------- EXPO -------------------- */
function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: "Manifest not found" });
  }

  res.setHeader("Content-Type", "application/json");
  res.send(fs.readFileSync(manifestPath, "utf-8"));
}

/* -------------------- LANDING PAGE -------------------- */
function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "templates",
    "landing-page.html",
  );

  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();

    const platform = req.header("expo-platform");
    if (platform === "ios" || platform === "android") {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      const protocol = req.header("x-forwarded-proto") || req.protocol;
      const host = req.header("x-forwarded-host") || req.get("host");
      const baseUrl = `${protocol}://${host}`;

      const html = landingPageTemplate
        .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
        .replace(/APP_NAME_PLACEHOLDER/g, appName);

      return res.status(200).send(html);
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
}

/* -------------------- ERROR HANDLER -------------------- */
function setupErrorHandler(app: express.Application) {
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
    });
  });
}

/* -------------------- BOOT -------------------- */
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = Number(process.env.PORT || 5000);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`🚀 Server running on port ${port}`);
  });
})();