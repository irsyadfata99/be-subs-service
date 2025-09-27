import app from "./app";
import logger from "./utils/logger";
import { CronService } from "./services/cronService";
import db from "../models";

const PORT = process.env.PORT || 5000;

// Start cron jobs (only in non-test environment)
if (process.env.NODE_ENV !== "test") {
  const cronService = new CronService();
  cronService.startAll();
}

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`API: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing server gracefully...");

  server.close(() => {
    logger.info("HTTP server closed");
  });

  try {
    await db.sequelize.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database", { error });
  }

  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing server gracefully...");

  server.close(() => {
    logger.info("HTTP server closed");
  });

  try {
    await db.sequelize.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database", { error });
  }

  process.exit(0);
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection:", { reason });
});

export default server;
