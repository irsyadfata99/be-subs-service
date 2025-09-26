import express from "express";
import * as reminderController from "../controllers/reminderController";
import { verifyToken } from "../middleware/auth";

const router = express.Router();

router.use(verifyToken);

router.get("/", reminderController.getReminders);
router.post("/send-manual", reminderController.sendManualReminder);
router.post("/retry/:id", reminderController.retryReminder);

export default router;
