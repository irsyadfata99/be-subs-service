import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";
import http from "http"; // ✅ ADD
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";
import { timeout } from "./middleware/timeout";
import { sanitizeXML, validatePayloadSize } from "./middleware/validateRequest"; // ✅ ADD
import { validateEnvironment } from "./utils/envValidator";
import db from "../models";
import { CronService } from "./services/cronService";
import logger from "./utils/logger";

// Import routes
import authRoutes from "./routes/auth";
import endUserRoutes from "./routes/endUsers";
import reminderRoutes from "./routes/reminders";
import billingRoutes from "./routes/billing";
import dashboardRoutes from "./routes/dashboard";
import healthRoutes from "./routes/health";
import adminRoutes from "./routes/admin";

dotenv.config();
validateEnvironment();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}

// Security & Middleware
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
  })
);

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL || "https://yourdomain.com"]
    : ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(sanitizeXML); // ✅ ADD
app.use(validatePayloadSize(10 * 1024 * 1024)); // ✅ ADD
app.use(requestLogger);
app.use(timeout(30));
app.use("/api/", apiLimiter);

// Routes
app.use("/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/end-users", endUserRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "Endpoint not found" });
});

// Sentry error handler
if (process.env.SENTRY_DSN) {
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    Sentry.captureException(err);
    next(err);
  });
}

// Error handler (must be last)
app.use(errorHandler);

// ✅ CREATE HTTP SERVER
let server: http.Server;
let cronService: CronService;

// ✅ GRACEFUL SHUTDOWN HANDLERS
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");

  // Stop accepting new requests
  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      // Close database connections
      await db.sequelize.close();
      logger.info("Database connections closed");

      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error: any) {
      logger.error("Error during graceful shutdown", { error: error.message });
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");
  process.exit(0);
});

// Unhandled rejection handler
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  logger.error("Unhandled Rejection", {
    reason: reason.message || reason,
    stack: reason.stack,
  });
});

// Uncaught exception handler
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });

  // Give time to log before exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Start Server
async function startServer() {
  try {
    await db.sequelize.authenticate();
    logger.info("✅ Database connected");

    // ✅ Create server instance
    server = app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);

      // Start cron jobs
      cronService = new CronService();
      cronService.startAll();
    });
  } catch (error) {
    logger.error("❌ Server start failed:", error);
    process.exit(1);
  }
}

startServer();
