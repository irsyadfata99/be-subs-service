import express from "express";
import authRoutes from "./auth";
import endUserRoutes from "./endUsers";
import reminderRoutes from "./reminders";
import billingRoutes from "./billing";
import dashboardRoutes from "./dashboard";
import adminRoutes from "./admin";
import webhookRoutes from "./webhook";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/end-users", endUserRoutes);
router.use("/reminders", reminderRoutes);
router.use("/billing", billingRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/admin", adminRoutes);
router.use("/webhook", webhookRoutes);

// ✅ FIX #2: Removed redundant route - handled in billing.ts and webhook.ts
// router.post("/webhook/tripay", handleTripayCallback);

export default router;
