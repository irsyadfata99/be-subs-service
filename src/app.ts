import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";
import { CronService } from "./services/cronService";
import logger from "./utils/logger";

// Import routes
import authRoutes from "./routes/auth";
import endUserRoutes from "./routes/endUsers";
import reminderRoutes from "./routes/reminders";
import billingRoutes from "./routes/billing";
import dashboardRoutes from "./routes/dashboard";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
  })
);

// CORS configuration
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL || "https://yourdomain.com"]
    : ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use("/api/", apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/end-users", endUserRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start cron jobs
const cronService = new CronService();
cronService.startAll();

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing server gracefully...");

  // Close database connection
  try {
    const db = require("../models");
    await db.sequelize.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database", { error });
  }

  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing server gracefully...");

  try {
    const db = require("../models");
    await db.sequelize.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database", { error });
  }

  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`API: http://localhost:${PORT}`);
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection:", { reason });
});

export default app;
