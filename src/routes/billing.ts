import express from "express";
import * as billingController from "../controllers/billingController";
import { verifyToken } from "../middleware/auth";
import { tripayIpWhitelist } from "../middleware/ipWhitelist";
import { invoiceLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// ====================================
// PUBLIC ROUTES (No Auth Required)
// ====================================

// ✅ FIX #2: Keep 2 callback routes for backward compatibility
// Tripay callback with IP whitelist - MUST be public
router.post(
  "/payment/callback",
  tripayIpWhitelist,
  billingController.paymentCallback
);

// Alternative callback route (for backward compatibility)
router.post("/callback", tripayIpWhitelist, billingController.paymentCallback);

// ====================================
// PROTECTED ROUTES (Auth Required)
// ====================================

router.get("/current", verifyToken, billingController.getCurrentBilling);

router.get("/invoices", verifyToken, billingController.getInvoices);

router.get("/invoices/:id", verifyToken, billingController.getInvoiceDetail);

router.get(
  "/suspended-invoice",
  verifyToken,
  billingController.getSuspendedInvoice
);

router.get(
  "/check-trial-invoice",
  verifyToken,
  billingController.checkAndGenerateTrialInvoice
);

// ====================================
// PAYMENT MANAGEMENT ROUTES
// ====================================

router.post(
  "/invoices/:id/create-payment",
  verifyToken,
  invoiceLimiter,
  billingController.createPayment
);

// ✅ FIX #10: Keep only one cancel payment route with :id parameter
router.post(
  "/invoices/:id/cancel-payment",
  verifyToken,
  invoiceLimiter,
  billingController.cancelPayment
);

router.post(
  "/invoices/:id/regenerate-payment",
  verifyToken,
  invoiceLimiter,
  billingController.regeneratePayment
);

router.post(
  "/invoices/:id/refresh-qr",
  verifyToken,
  invoiceLimiter,
  billingController.refreshQR
);

// ====================================
// DEPRECATED ROUTES (Keep for backward compatibility)
// ====================================

router.post("/invoices/:id/pay", verifyToken, billingController.createPayment);

export default router;
