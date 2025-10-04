import { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { BillingService } from "../services/billingService";
import { validateTripayCallback } from "../utils/helpers";
import logger from "../utils/logger";

const { PlatformInvoice, Client } = db;

const billingService = new BillingService();

export const getCurrentBilling = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;

    const client = await Client.findByPk(clientId, {
      attributes: [
        "id",
        "business_name",
        "status",
        "total_users",
        "monthly_bill",
        "trial_ends_at",
      ],
    });

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const now = new Date();
    const trialDaysRemaining = client.trial_ends_at
      ? Math.ceil(
          (new Date(client.trial_ends_at).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    res.json({
      success: true,
      data: {
        client: client,
        trial_days_remaining: Math.max(0, trialDaysRemaining),
        monthly_bill_estimate: client.monthly_bill,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;
    const { status, page = 1, limit = 10 } = req.query;

    const where: any = { client_id: clientId };
    if (status) where.status = status;

    const maxLimit = 100;
    const validLimit = Math.min(Number(limit), maxLimit);
    const offset = (Number(page) - 1) * validLimit;

    const { count, rows } = await PlatformInvoice.findAndCountAll({
      where,
      limit: validLimit,
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        invoices: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: validLimit,
          totalPages: Math.ceil(count / validLimit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceDetail = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;

    const invoice = await PlatformInvoice.findOne({
      where: { id, client_id: clientId },
    });

    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * NEW: Get suspended invoice for modal
 * GET /api/billing/suspended-invoice
 */
export const getSuspendedInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;

    if (!clientId) {
      throw new AppError("Unauthorized", 401);
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // Only allow suspended or trial clients
    if (client.status !== "suspended" && client.status !== "trial") {
      return res.json({
        success: true,
        message: "Account is not suspended",
        data: null,
      });
    }

    // Find pending or overdue invoice
    const invoice = await PlatformInvoice.findOne({
      where: {
        client_id: clientId,
        status: { [Op.in]: ["pending", "overdue"] },
      },
      order: [["created_at", "DESC"]],
    });

    if (!invoice) {
      // If suspended but no invoice, generate one for trial clients
      if (client.status === "trial") {
        const result = await billingService.generateOrGetTrialInvoice(clientId);
        return res.json({
          success: true,
          data: result.invoice,
        });
      }

      return res.json({
        success: true,
        message: "No pending invoice found",
        data: null,
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create payment for invoice after user selects payment method
 * POST /api/billing/invoices/:id/create-payment
 */
export const createPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { payment_method } = req.body;
    const clientId = req.user?.id;

    if (!clientId) {
      throw new AppError("Unauthorized", 401);
    }

    if (!payment_method || !["BCA_VA", "QRIS"].includes(payment_method)) {
      throw new AppError("Invalid payment method. Must be BCA_VA or QRIS", 400);
    }

    const result = await billingService.createPaymentForInvoice(
      Number(id),
      clientId,
      payment_method as "BCA_VA" | "QRIS"
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel payment (allow user to change payment method)
 * POST /api/billing/invoices/:id/cancel-payment
 */
export const cancelPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, invoiceId } = req.params; // Support both :id and :invoiceId
    const actualId = id || invoiceId;
    const clientId = req.user?.id;

    if (!clientId) {
      throw new AppError("Unauthorized", 401);
    }

    const invoice = await PlatformInvoice.findOne({
      where: {
        id: Number(actualId),
        client_id: clientId,
        status: "pending",
      },
    });

    if (!invoice) {
      throw new AppError("Invoice not found or already paid", 404);
    }

    if (!invoice.payment_method_selected) {
      throw new AppError("No payment to cancel", 400);
    }

    // Clear payment data (let it expire at Tripay)
    await invoice.update({
      payment_method_selected: null,
      tripay_reference: null,
      tripay_merchant_ref: null,
      tripay_payment_url: null,
      tripay_qr_url: null,
      tripay_va_number: null,
      tripay_expired_time: null,
    });

    logger.info(`Payment cancelled for invoice ${invoice.invoice_number}`);

    res.json({
      success: true,
      message: "Payment cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate payment when expired
 * POST /api/billing/invoices/:id/regenerate-payment
 */
export const regeneratePayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;

    if (!clientId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await billingService.regeneratePayment(Number(id), clientId);

    res.json({
      success: true,
      message: "Payment regenerated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh QR code for QRIS payment
 * POST /api/billing/invoices/:id/refresh-qr
 */
export const refreshQR = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;

    if (!clientId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await billingService.refreshQRCode(Number(id), clientId);

    res.json({
      success: true,
      message: "QR code refreshed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check and generate trial invoice (without payment)
 * GET /api/billing/check-trial-invoice
 */
export const checkAndGenerateTrialInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;

    if (!clientId) {
      throw new AppError("Unauthorized", 401);
    }

    const client = await Client.findByPk(clientId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    if (client.status !== "trial") {
      return res.json({
        success: true,
        message: "Client is not in trial",
        data: null,
      });
    }

    const now = new Date();
    const trialEndsAt = new Date(client.trial_ends_at);
    const daysRemaining = Math.ceil(
      (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining > 7) {
      return res.json({
        success: true,
        message: "Trial has more than 7 days remaining",
        data: null,
      });
    }

    const result = await billingService.generateOrGetTrialInvoice(clientId);

    res.json({
      success: true,
      message: "Invoice ready (payment method not selected yet)",
      data: result.invoice,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process payment callback from Tripay
 * POST /api/billing/callback OR /api/billing/payment/callback
 */
export const paymentCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const callbackSignature =
      (req.headers["x-callback-signature"] as string) || "";
    const jsonBody = JSON.stringify(req.body);

    const isValid = validateTripayCallback(jsonBody, callbackSignature);

    if (!isValid) {
      logger.warn("Invalid Tripay callback signature", {
        ip: req.ip,
        body: req.body,
      });
      throw new AppError("Invalid callback signature", 401);
    }

    const result = await billingService.processPaymentCallback(req.body);

    res.json({
      success: true,
      message: "Payment callback processed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
