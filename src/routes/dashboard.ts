import express from "express";
import * as dashboardController from "../controllers/dashboardController";
import { verifyToken } from "../middleware/auth";

const router = express.Router();

router.get("/stats", verifyToken, dashboardController.getDashboardStats);

export default router;
