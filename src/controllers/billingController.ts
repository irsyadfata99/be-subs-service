import { Request, Response, NextFunction } from "express";
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { BillingService } from "../services/billingService";
import { validateTripayCallback } from "../utils/helpers";
import logger from "../utils/logger";

const { PlatformInvoice, Client } = db;

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

export const createInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;
    const billingService = new BillingService();

    const result = await billingService.generateMonthlyInvoice(clientId!);

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const paymentCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const callbackSignature =
      (req.headers["x-callback-signature"] as string) || "";
    const jsonBody = JSON.stringify(req.body);

    // Validate signature
    const isValid = validateTripayCallback(jsonBody, callbackSignature);

    if (!isValid) {
      logger.warn("Invalid Tripay callback signature", {
        ip: req.ip,
        body: req.body,
      });
      throw new AppError("Invalid callback signature", 401);
    }

    const billingService = new BillingService();
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
