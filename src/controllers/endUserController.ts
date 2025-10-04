import { Response, NextFunction } from "express";
import { Op } from "sequelize";
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { formatPhone } from "../utils/helpers";
import { addMonths } from "../utils/helpers";
import logger from "../utils/logger";

const { EndUser, Client } = db;

// Helper: Sanitize search input
const sanitizeSearch = (input: string): string => {
  return input.replace(/[%_\\]/g, "\\$&");
};

export const getEndUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;
    const { status, search, page = 1, limit = 10 } = req.query;

    const where: any = { client_id: clientId };

    if (status) {
      where.status = status;
    }

    if (search) {
      const sanitized = sanitizeSearch(String(search));
      where[Op.or] = [
        { name: { [Op.like]: `%${sanitized}%` } },
        { phone: { [Op.like]: `%${sanitized}%` } },
      ];
    }

    // Limit max pagination
    const maxLimit = 100;
    const validLimit = Math.min(Number(limit), maxLimit);
    const offset = (Number(page) - 1) * validLimit;

    const { count, rows } = await EndUser.findAndCountAll({
      where,
      limit: validLimit,
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        end_users: rows,
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

export const markAsPaid = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;

    const endUser = await EndUser.findOne({
      where: { id, client_id: clientId },
    });

    if (!endUser) {
      throw new AppError("End user not found", 404);
    }

    let nextDueDate: Date;

    if (endUser.status === "overdue") {
      nextDueDate = new Date(endUser.due_date);
    } else {
      nextDueDate = addMonths(new Date(endUser.due_date), 1);
    }

    await endUser.update({
      status: "active",
      due_date: nextDueDate,
      payment_date: new Date(),
      last_reminder_sent: new Date(),
    });

    await updateClientBilling(clientId!);

    res.json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        end_user: endUser,
        next_due_date: nextDueDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;
    const { user_ids, action } = req.body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new AppError("user_ids array is required", 400);
    }

    if (user_ids.length > 100) {
      throw new AppError("Maximum 100 users per batch", 400);
    }

    if (!["mark_paid", "mark_overdue", "mark_inactive"].includes(action)) {
      throw new AppError("Invalid action", 400);
    }

    const endUsers = await EndUser.findAll({
      where: {
        id: { [Op.in]: user_ids },
        client_id: clientId,
      },
    });

    if (endUsers.length === 0) {
      throw new AppError("No users found", 404);
    }

    // FIX: Define proper type for results array
    const results: Array<{
      id: number;
      name: string;
      next_due_date?: Date;
    }> = [];

    for (const user of endUsers) {
      if (action === "mark_paid") {
        let nextDueDate: Date;

        if (user.status === "overdue") {
          nextDueDate = new Date(user.due_date);
        } else {
          nextDueDate = addMonths(new Date(user.due_date), 1);
        }

        await user.update({
          status: "active",
          due_date: nextDueDate,
          payment_date: new Date(),
          last_reminder_sent: new Date(),
        });

        results.push({
          id: user.id,
          name: user.name,
          next_due_date: nextDueDate,
        });
      } else if (action === "mark_overdue") {
        await user.update({ status: "overdue" });
        results.push({ id: user.id, name: user.name });
      } else if (action === "mark_inactive") {
        await user.update({ status: "inactive" });
        results.push({ id: user.id, name: user.name });
      }
    }

    await updateClientBilling(clientId!);

    res.json({
      success: true,
      message: `${endUsers.length} users updated successfully`,
      data: {
        updated_count: endUsers.length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Other functions remain same...
export const createEndUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;
    const { name, phone, package_name, package_price, billing_cycle } =
      req.body;

    // Calculate due_date on backend
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(billing_cycle));

    const formattedPhone = formatPhone(phone);

    const endUser = await EndUser.create({
      client_id: clientId,
      name,
      phone: formattedPhone,
      package_name,
      package_price,
      billing_cycle: billing_cycle.toString(), // Store as string in DB
      due_date: dueDate,
      status: "active",
    });

    await updateClientBilling(clientId!);

    res.status(201).json({
      success: true,
      message: "End user created successfully",
      data: endUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getEndUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;

    const endUser = await EndUser.findOne({
      where: { id, client_id: clientId },
    });

    if (!endUser) {
      throw new AppError("End user not found", 404);
    }

    res.json({
      success: true,
      data: endUser,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEndUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;

    const endUser = await EndUser.findOne({
      where: { id, client_id: clientId },
    });

    if (!endUser) {
      throw new AppError("End user not found", 404);
    }

    const updateData: any = { ...req.body };

    if (updateData.phone) {
      updateData.phone = formatPhone(updateData.phone);
    }

    await endUser.update(updateData);
    await updateClientBilling(clientId!);

    res.json({
      success: true,
      message: "End user updated successfully",
      data: endUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEndUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;

    const endUser = await EndUser.findOne({
      where: { id, client_id: clientId },
    });

    if (!endUser) {
      throw new AppError("End user not found", 404);
    }

    await endUser.update({ status: "inactive" });
    await updateClientBilling(clientId!);

    res.json({
      success: true,
      message: "End user deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

async function updateClientBilling(clientId: number) {
  try {
    const activeUsers = await EndUser.count({
      where: {
        client_id: clientId,
        status: { [Op.in]: ["active", "overdue"] },
      },
    });

    const pricePerUser = 3000;
    const monthlyBill = activeUsers * pricePerUser;

    const [updatedRows] = await Client.update(
      {
        total_users: activeUsers,
        monthly_bill: monthlyBill,
      },
      { where: { id: clientId } }
    );

    if (updatedRows > 0) {
      logger.info(`Client billing updated`, {
        clientId,
        activeUsers,
        monthlyBill,
      });
    }
  } catch (error: any) {
    logger.error("Failed to update client billing", {
      error: error.message,
      clientId,
    });
  }
}
