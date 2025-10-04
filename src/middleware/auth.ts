import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../../models";
import { AppError } from "./errorHandler";
import logger from "../utils/logger";

const { Client, PlatformInvoice } = db;

interface JwtPayload {
  id: number;
  email: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Verify JWT token
 */
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("No token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "default_secret";

    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError("Invalid token", 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError("Token expired", 401));
    } else {
      next(error);
    }
  }
};

/**
 * ✅ NEW: Check account status and block suspended accounts
 * This middleware should be applied AFTER verifyToken
 *
 * Usage:
 * router.get('/dashboard', verifyToken, checkAccountStatus, getDashboard);
 */
export const checkAccountStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User ID not found in token", 401);
    }

    // Get client info
    const client = await Client.findByPk(userId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const now = new Date();
    let shouldSuspend = false;
    let suspensionReason = "";
    let suspensionDetails: any = {};

    // 1. Check if trial expired
    if (client.status === "trial" && client.trial_ends_at) {
      const trialEndsAt = new Date(client.trial_ends_at);
      if (trialEndsAt <= now) {
        shouldSuspend = true;
        suspensionReason = "trial_expired";
        suspensionDetails = {
          trial_ends_at: client.trial_ends_at,
          message: "Your trial period has ended. Please complete payment to continue.",
        };

        logger.info(`Client ${client.id} trial expired - blocking access`, {
          trial_ends_at: client.trial_ends_at,
        });
      }
    }

    // 2. Check if has overdue invoices (for active clients)
    if (client.status === "active") {
      const overdueInvoice = await PlatformInvoice.findOne({
        where: {
          client_id: client.id,
          status: "pending",
          due_date: { [Op.lt]: now },
        },
        order: [["due_date", "ASC"]],
      });

      if (overdueInvoice) {
        shouldSuspend = true;
        suspensionReason = "payment_overdue";
        suspensionDetails = {
          invoice_number: overdueInvoice.invoice_number,
          due_date: overdueInvoice.due_date,
          amount: overdueInvoice.total_amount,
          message: "Your payment is overdue. Please complete payment to restore access.",
        };

        // Update invoice status to overdue
        await overdueInvoice.update({ status: "overdue" });

        logger.info(`Client ${client.id} has overdue invoice - blocking access`, {
          invoice_number: overdueInvoice.invoice_number,
          due_date: overdueInvoice.due_date,
        });
      }
    }

    // 3. Update client status if needed
    if (shouldSuspend && client.status !== "suspended") {
      await client.update({ status: "suspended" });

      logger.warn(`Client ${client.id} auto-suspended via middleware`, {
        reason: suspensionReason,
        previous_status: client.status,
      });
    }

    // 4. Block access if suspended
    if (client.status === "suspended" || shouldSuspend) {
      // Get pending invoice for suspended clients
      const pendingInvoice = await PlatformInvoice.findOne({
        where: {
          client_id: client.id,
          status: { [Op.in]: ["pending", "overdue"] },
        },
        order: [["created_at", "DESC"]],
      });

      return res.status(403).json({
        success: false,
        error: "Account suspended",
        data: {
          status: "suspended",
          reason: suspensionReason || "account_suspended",
          details: suspensionDetails,
          invoice: pendingInvoice
            ? {
                id: pendingInvoice.id,
                invoice_number: pendingInvoice.invoice_number,
                total_amount: pendingInvoice.total_amount,
                due_date: pendingInvoice.due_date,
                payment_method_selected: pendingInvoice.payment_method_selected,
                tripay_va_number: pendingInvoice.tripay_va_number,
                tripay_qr_url: pendingInvoice.tripay_qr_url,
                tripay_payment_url: pendingInvoice.tripay_payment_url,
                tripay_expired_time: pendingInvoice.tripay_expired_time,
              }
            : null,
        },
      });
    }

    // 5. Allow access if status is OK
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ NEW: Check if user is super_admin
 * Usage:
 * router.get('/admin/stats', verifyToken, requireSuperAdmin, getAdminStats);
 */
export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User ID not found in token", 401);
    }

    const client = await Client.findByPk(userId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    if (client.role !== "super_admin") {
      throw new AppError("Access denied. Super admin only.", 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ NEW: Check if user is admin or super_admin
 * Usage:
 * router.get('/reports', verifyToken, requireAdmin, getReports);
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("User ID not found in token", 401);
    }

    const client = await Client.findByPk(userId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    if (client.role !== "admin" && client.role !== "super_admin") {
      throw new AppError("Access denied. Admin access required.", 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
