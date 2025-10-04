import express from "express";
import * as dashboardController from "../controllers/dashboardController";
import { verifyToken, checkAccountStatus } from "../middleware/auth";
import { cacheMiddleware } from "../middleware/cache"; // ✅ ADD

const router = express.Router();

router.use(verifyToken);
router.use(checkAccountStatus);

// ✅ Cache dashboard for 30 seconds (frequent updates needed)
router.get(
  "/",
  cacheMiddleware(30 * 1000),
  dashboardController.getDashboardStats
);

export default router;
