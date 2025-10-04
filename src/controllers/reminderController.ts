import { Response, NextFunction } from "express";
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { WhatsAppService } from "../services/whatsappService.ts.backup";

const { Reminder, EndUser, Client } = db;

export const getReminders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;
    const { status, type, page = 1, limit = 20 } = req.query;

    const where: any = { client_id: clientId };

    if (status) where.status = status;
    if (type) where.type = type;

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Reminder.findAndCountAll({
      where,
      include: [
        {
          model: EndUser,
          as: "end_user",
          attributes: ["id", "name", "phone"],
        },
      ],
      limit: Number(limit),
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        reminders: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sendManualReminder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;
    const { end_user_id, type } = req.body;

    if (!["before_3days", "before_1day", "overdue"].includes(type)) {
      throw new AppError("Invalid reminder type", 400);
    }

    const endUser = await EndUser.findOne({
      where: { id: end_user_id, client_id: clientId },
      include: [{ model: Client, as: "client" }],
    });

    if (!endUser) {
      throw new AppError("End user not found", 404);
    }

    const whatsappService = new WhatsAppService();

    const reminderData = {
      name: endUser.name,
      businessName: (endUser as any).client.business_name,
      packageName: endUser.package_name,
      packagePrice: parseFloat(endUser.package_price.toString()),
      dueDate: new Date(endUser.due_date),
      type: type as "before_3days" | "before_1day" | "overdue",
      phone: endUser.phone,
    };

    const response = await whatsappService.sendPaymentReminder(reminderData);

    const reminder = await Reminder.create({
      client_id: clientId!,
      end_user_id: end_user_id,
      phone: endUser.phone,
      message: whatsappService.generateReminderMessage(reminderData),
      type: type,
      status: "sent",
      response: response,
      sent_at: new Date(),
    });

    await endUser.update({ last_reminder_sent: new Date() });

    res.json({
      success: true,
      message: "Reminder sent successfully",
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};

export const retryReminder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const clientId = req.user?.id;

    const reminder = await Reminder.findOne({
      where: { id, client_id: clientId },
      include: [
        {
          model: EndUser,
          as: "end_user",
          include: [{ model: Client, as: "client" }],
        },
      ],
    });

    if (!reminder) {
      throw new AppError("Reminder not found", 404);
    }

    if (reminder.status === "sent") {
      throw new AppError("Reminder already sent successfully", 400);
    }

    const whatsappService = new WhatsAppService();
    const endUser = (reminder as any).end_user;

    const reminderData = {
      name: endUser.name,
      businessName: endUser.client.business_name,
      packageName: endUser.package_name,
      packagePrice: parseFloat(endUser.package_price.toString()),
      dueDate: new Date(endUser.due_date),
      type: reminder.type as "before_3days" | "before_1day" | "overdue",
      phone: endUser.phone,
    };

    const response = await whatsappService.sendPaymentReminder(reminderData);

    await reminder.update({
      status: "sent",
      response: response,
      sent_at: new Date(),
    });

    res.json({
      success: true,
      message: "Reminder retried and sent successfully",
      data: reminder,
    });
  } catch (error) {
    next(error);
  }
};
