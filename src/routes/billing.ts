import express from "express";
import * as billingController from "../controllers/billingController";
import { verifyToken } from "../middleware/auth";

const router = express.Router();

router.get("/current", verifyToken, billingController.getCurrentBilling);
router.get("/invoices", verifyToken, billingController.getInvoices);
router.get("/invoices/:id", verifyToken, billingController.getInvoiceDetail);
router.post("/invoices", verifyToken, billingController.createInvoice);

// Fix: Async handler wrapper
router.post("/payment/callback", async (req, res, next) => {
  try {
    await billingController.paymentCallback(req as any, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;
