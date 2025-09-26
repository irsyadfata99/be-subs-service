import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { errorHandler } from "./middleware/errorHandler";
import { CronService } from "./services/cronService";

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

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/end-users", endUserRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Start cron jobs
const cronService = new CronService();
cronService.startAll();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 API: http://localhost:${PORT}`);
});

export default app;
