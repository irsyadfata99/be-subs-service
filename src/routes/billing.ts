import express from "express";
import * as billingController from "../controllers/billingController";
import { verifyToken } from "../middleware/auth";
import { invoiceLimiter } from "../middleware/rateLimiter";
import { tripayIpWhitelist } from "../middleware/ipWhitelist";

const router = express.Router();

router.get("/current", verifyToken, billingController.getCurrentBilling);
router.get("/invoices", verifyToken, billingController.getInvoices);
router.get("/invoices/:id", verifyToken, billingController.getInvoiceDetail);
router.post(
  "/invoices",
  verifyToken,
  invoiceLimiter,
  billingController.createInvoice
);

// Tripay callback with IP whitelist
router.post(
  "/payment/callback",
  tripayIpWhitelist,
  billingController.paymentCallback
);

export default router;
