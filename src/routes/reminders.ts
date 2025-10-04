import express from "express";
import * as reminderController from "../controllers/reminderController";
import { verifyToken, checkAccountStatus } from "../middleware/auth";

const router = express.Router();

router.use(verifyToken);
router.use(checkAccountStatus);

router.get("/", reminderController.getReminders);
router.post("/send-manual", reminderController.sendManualReminder);
router.post("/retry/:id", reminderController.retryReminder);

export default router;
