import express from "express";
import * as adminController from "../controllers/adminController";
import { verifyToken, requireSuperAdmin } from "../middleware/auth";

const router = express.Router();

// All admin routes require super_admin role
router.use(verifyToken);
router.use(requireSuperAdmin);

// Dashboard stats
router.get("/stats", adminController.getAdminStats);

// Client management
router.get("/clients", adminController.getAllClients);
router.get("/clients/:id", adminController.getClientDetail);
router.delete("/clients/:id", adminController.deleteClient);

// Pricing adjustment
router.post("/clients/:id/adjust-pricing", adminController.adjustClientPricing);

// System logs
router.get("/logs/errors", adminController.getErrorLogs);
router.get("/logs/cron-jobs", adminController.getCronJobLogs);
router.get("/logs/cron-summary", adminController.getCronJobSummary);
router.post("/logs/cleanup", adminController.cleanupLogs);

export default router;
