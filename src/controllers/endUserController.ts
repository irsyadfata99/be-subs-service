import { Response, NextFunction } from "express";
import { Op } from "sequelize";
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { formatPhone } from "../utils/helpers";

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

// Other functions remain same...
export const createEndUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;
    const {
      name,
      phone,
      package_name,
      package_price,
      billing_cycle,
      due_date,
    } = req.body;

    const formattedPhone = formatPhone(phone);

    const endUser = await EndUser.create({
      client_id: clientId,
      name,
      phone: formattedPhone,
      package_name,
      package_price,
      billing_cycle,
      due_date,
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
  const activeUsers = await EndUser.count({
    where: {
      client_id: clientId,
      status: { [Op.in]: ["active", "overdue"] },
    },
  });

  const monthlyBill = activeUsers * 3000;

  await Client.update(
    {
      total_users: activeUsers,
      monthly_bill: monthlyBill,
    },
    { where: { id: clientId } }
  );
}
