import { Response, NextFunction } from "express";
import { Op } from "sequelize";
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";

const { Client, EndUser, Reminder, PlatformInvoice } = db;

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const clientId = req.user?.id;

    // Get client info
    const client = await Client.findByPk(clientId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // Count end users by status
    const totalUsers = await EndUser.count({
      where: { client_id: clientId },
    });

    const activeUsers = await EndUser.count({
      where: { client_id: clientId, status: "active" },
    });

    const overdueUsers = await EndUser.count({
      where: { client_id: clientId, status: "overdue" },
    });

    const inactiveUsers = await EndUser.count({
      where: { client_id: clientId, status: "inactive" },
    });

    // Reminder stats
    const totalReminders = await Reminder.count({
      where: { client_id: clientId },
    });

    const sentReminders = await Reminder.count({
      where: { client_id: clientId, status: "sent" },
    });

    const failedReminders = await Reminder.count({
      where: { client_id: clientId, status: "failed" },
    });

    // Latest reminders
    const latestReminders = await Reminder.findAll({
      where: { client_id: clientId },
      include: [
        {
          model: EndUser,
          as: "end_user",
          attributes: ["name", "phone"],
        },
      ],
      limit: 5,
      order: [["created_at", "DESC"]],
    });

    // Invoice stats
    const pendingInvoice = await PlatformInvoice.findOne({
      where: { client_id: clientId, status: "pending" },
      order: [["created_at", "DESC"]],
    });

    const paidInvoicesCount = await PlatformInvoice.count({
      where: { client_id: clientId, status: "paid" },
    });

    // Trial info
    const now = new Date();
    const trialDaysRemaining = client.trial_ends_at
      ? Math.ceil(
          (new Date(client.trial_ends_at).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    // Upcoming due dates
    const upcomingDueDates = await EndUser.findAll({
      where: {
        client_id: clientId,
        status: { [Op.in]: ["active", "overdue"] },
        due_date: {
          [Op.between]: [
            now,
            new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          ],
        },
      },
      order: [["due_date", "ASC"]],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        client: {
          business_name: client.business_name,
          status: client.status,
          trial_days_remaining: Math.max(0, trialDaysRemaining),
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          overdue: overdueUsers,
          inactive: inactiveUsers,
        },
        reminders: {
          total: totalReminders,
          sent: sentReminders,
          failed: failedReminders,
          latest: latestReminders,
        },
        billing: {
          monthly_bill: client.monthly_bill,
          pending_invoice: pendingInvoice,
          paid_invoices_count: paidInvoicesCount,
        },
        upcoming_due_dates: upcomingDueDates,
      },
    });
  } catch (error) {
    next(error);
  }
};
