import express from "express";
import db from "../../models";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

router.get("/detailed", async (req, res) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {
      database: { status: "unknown", message: "" },
      memory: { status: "OK", usage: {} },
      disk: { status: "OK" },
    },
  };

  // Check database
  try {
    await db.sequelize.authenticate();
    health.checks.database = { status: "OK", message: "Connected" };
  } catch (error) {
    health.status = "ERROR";
    health.checks.database = {
      status: "ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Check memory
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: "OK",
    usage: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    },
  };

  res.json(health);
});

export default router;
