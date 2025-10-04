import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { Op } from "sequelize";
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { addDays } from "../utils/helpers";
import { AuthRequest } from "../middleware/auth";
import logger from "../utils/logger";

const { Client, PlatformInvoice } = db;

/**
 * Helper function: Check and update client status in real-time
 * Returns suspension reason if client should be suspended
 */
async function checkAndUpdateClientStatus(client: any): Promise<string | null> {
  const now = new Date();
  let shouldSuspend = false;
  let suspensionReason: string | null = null;

  // 1. Check if trial expired
  if (client.status === "trial" && client.trial_ends_at) {
    const trialEndsAt = new Date(client.trial_ends_at);
    if (trialEndsAt <= now) {
      shouldSuspend = true;
      suspensionReason = "trial_expired";
      logger.info(`Client ${client.id} trial expired`, {
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

      // Update invoice status to overdue
      await overdueInvoice.update({ status: "overdue" });

      logger.info(`Client ${client.id} has overdue invoice`, {
        invoice_number: overdueInvoice.invoice_number,
        due_date: overdueInvoice.due_date,
      });
    }
  }

  // 3. Suspend if needed
  if (shouldSuspend && client.status !== "suspended") {
    await client.update({ status: "suspended" });

    logger.warn(`Client ${client.id} suspended`, {
      reason: suspensionReason,
      previous_status: client.status,
    });
  }

  return suspensionReason;
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { business_name, business_type, email, password, phone, contact_whatsapp, logo_url } = req.body;

    const existingClient = await Client.findOne({ where: { email } });
    if (existingClient) {
      throw new AppError("Email already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const trialEndsAt = addDays(new Date(), 90);
    const billingDate = new Date().getDate();

    const client = await Client.create({
      business_name,
      business_type,
      email,
      password: hashedPassword,
      phone,
      contact_whatsapp,
      logo_url,
      status: "trial",
      trial_ends_at: trialEndsAt,
      billing_date: billingDate,
    });

    const token = jwt.sign({ id: client.id, email: client.email }, process.env.JWT_SECRET as string, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        client: {
          id: client.id,
          business_name: client.business_name,
          email: client.email,
          contact_whatsapp: client.contact_whatsapp,
          status: client.status,
          trial_ends_at: client.trial_ends_at,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const client = await Client.findOne({ where: { email } });
    if (!client) {
      throw new AppError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, client.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    // Check and update status in real-time BEFORE generating token
    const suspensionReason = await checkAndUpdateClientStatus(client);

    // Reload client to get updated status
    await client.reload();

    // Generate token
    const token = jwt.sign({ id: client.id, email: client.email }, process.env.JWT_SECRET as string, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions);

    // Update last active
    await client.update({ last_active_at: new Date() });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        client: {
          id: client.id,
          business_name: client.business_name,
          email: client.email,
          role: client.role,
          status: client.status,
          trial_ends_at: client.trial_ends_at,
          suspension_reason: suspensionReason, // NEW: Return suspension reason
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const client = await Client.findByPk(req.user?.id, {
      attributes: { exclude: ["password"] },
    });

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // Check and update status in real-time
    const suspensionReason = await checkAndUpdateClientStatus(client);
    await client.reload();

    await client.update({ last_active_at: new Date() });

    return res.json({
      success: true,
      data: {
        ...client.toJSON(),
        suspension_reason: suspensionReason, // NEW: Return suspension reason
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: "Logout successful",
  });
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const clientId = req.user?.id;

    const client = await Client.findByPk(clientId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, client.password);
    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await client.update({ password: hashedPassword });

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { business_name, phone, contact_whatsapp, logo_url } = req.body;
    const clientId = req.user?.id;

    const client = await Client.findByPk(clientId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    await client.update({
      business_name: business_name || client.business_name,
      phone: phone || client.phone,
      contact_whatsapp: contact_whatsapp || client.contact_whatsapp,
      logo_url: logo_url || client.logo_url,
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: client.id,
        business_name: client.business_name,
        business_type: client.business_type,
        email: client.email,
        phone: client.phone,
        contact_whatsapp: client.contact_whatsapp,
        logo_url: client.logo_url,
        status: client.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
