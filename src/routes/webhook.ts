import express from "express";
import * as webhookController from "../controllers/webhookController";

const router = express.Router();

// Tripay payment callback
router.post("/tripay", webhookController.handleTripayCallback);

// ✅ REMOVED: Meta WhatsApp webhook routes
// Twilio webhook berbeda - tidak dibutuhkan untuk saat ini
// Jika butuh status delivery, bisa ditambahkan nanti

export default router;
