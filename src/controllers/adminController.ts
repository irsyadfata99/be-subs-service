import { Response, NextFunction } from "express";
import { Op } from "sequelize";
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import logger from "../utils/logger";

const { Client, EndUser, Reminder, PlatformInvoice, PricingAdjustment, ErrorLog, CronJobLog } = db;

// Get dashboard stats
export const getAdminStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Total clients by status
    const clientStats = await Client.findAll({
      attributes: ["status", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true,
    });

    const statusCounts = clientStats.reduce((acc: any, curr: any) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});

    // Total end users
    const totalEndUsers = await EndUser.count();

    // Revenue this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const revenueThisMonth = await PlatformInvoice.sum("total_amount", {
      where: {
        status: "paid",
        paid_at: {
          [Op.between]: [firstDay, lastDay],
        },
      },
    });

    // Reminders today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const remindersToday = await Reminder.findAll({
      attributes: ["status", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]],
      where: {
        created_at: {
          [Op.between]: [todayStart, todayEnd],
        },
      },
      group: ["status"],
      raw: true,
    });

    const reminderCounts = remindersToday.reduce((acc: any, curr: any) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});

    // System health
    const dbStatus = await checkDatabaseHealth();

    res.json({
      success: true,
      data: {
        clients: {
          total: Object.values(statusCounts).reduce((a: any, b: any) => a + b, 0),
          trial: statusCounts.trial || 0,
          active: statusCounts.active || 0,
          overdue: statusCounts.overdue || 0,
          suspended: statusCounts.suspended || 0,
        },
        end_users: {
          total: totalEndUsers,
        },
        revenue: {
          this_month: revenueThisMonth || 0,
        },
        reminders: {
          today: {
            sent: reminderCounts.sent || 0,
            failed: reminderCounts.failed || 0,
          },
        },
        system: {
          database: dbStatus,
          memory: getMemoryUsage(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all clients with filters
export const getAllClients = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, role, search, page = 1, limit = 20 } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [{ business_name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Client.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      limit: Number(limit),
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        clients: rows,
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

// Get client detail
export const getClientDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const client = await Client.findByPk(id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: EndUser,
          as: "end_users",
          attributes: ["id", "name", "status"],
        },
        {
          model: PlatformInvoice,
          as: "invoices",
          limit: 10,
          order: [["created_at", "DESC"]],
        },
        {
          model: PricingAdjustment,
          as: "pricing_adjustments",
          limit: 5,
          order: [["adjusted_at", "DESC"]],
        },
      ],
    });

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // Get reminder stats
    const reminderStats = await Reminder.findAll({
      attributes: ["status", [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"]],
      where: { client_id: id },
      group: ["status"],
      raw: true,
    });

    const reminderCounts = reminderStats.reduce((acc: any, curr: any) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        client,
        reminders: {
          sent: reminderCounts.sent || 0,
          failed: reminderCounts.failed || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete client
export const deleteClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // force=true untuk hard delete

    const client = await Client.findByPk(id);

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // Check if can hard delete
    const now = new Date();
    const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
    const canHardDelete = client.status === "trial" || client.last_active_at < oneYearAgo || force === "true";

    if (canHardDelete) {
      // Hard delete - cascade akan handle related data
      await client.destroy();

      logger.info(`Client hard deleted`, {
        client_id: client.id,
        business_name: client.business_name,
        deleted_by: req.user?.id,
      });

      res.json({
        success: true,
        message: "Client permanently deleted",
        data: { deleted_type: "hard" },
      });
    } else {
      // Soft delete - mark as inactive
      await client.update({ status: "suspended" });

      logger.info(`Client marked as inactive`, {
        client_id: client.id,
        business_name: client.business_name,
        updated_by: req.user?.id,
      });

      res.json({
        success: true,
        message: "Client marked as inactive",
        data: { deleted_type: "soft" },
      });
    }
  } catch (error) {
    next(error);
  }
};

// Adjust client pricing
export const adjustClientPricing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { new_price, reason } = req.body;
    const superAdminId = req.user?.id;

    if (!new_price || new_price <= 0) {
      throw new AppError("Invalid price", 400);
    }

    const client = await Client.findByPk(id);

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const oldPrice = client.monthly_bill / (client.total_users || 1);
    const newMonthlyBill = new_price * client.total_users;

    // Save adjustment history
    await PricingAdjustment.create({
      client_id: client.id,
      old_price: oldPrice,
      new_price: new_price,
      reason: reason || "Manual adjustment",
      adjusted_by: superAdminId!,
    });

    // Update client pricing
    await client.update({
      monthly_bill: newMonthlyBill,
    });

    logger.info(`Client pricing adjusted`, {
      client_id: client.id,
      old_price: oldPrice,
      new_price: new_price,
      adjusted_by: superAdminId,
    });

    res.json({
      success: true,
      message: "Pricing adjusted successfully",
      data: {
        old_price: oldPrice,
        new_price: new_price,
        new_monthly_bill: newMonthlyBill,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getErrorLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { level, service, client_id, page = 1, limit = 50 } = req.query;

    const where: any = {};

    if (level) where.level = level;
    if (service) where.service = service;
    if (client_id) where.client_id = client_id;

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await ErrorLog.findAndCountAll({
      where,
      include: [
        {
          model: Client,
          as: "client",
          attributes: ["id", "business_name"],
          required: false,
        },
      ],
      limit: Number(limit),
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        logs: rows,
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

// Get cron job logs
export const getCronJobLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { job_name, status, page = 1, limit = 50 } = req.query;

    const where: any = {};

    if (job_name) where.job_name = job_name;
    if (status) where.status = status;

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await CronJobLog.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [["started_at", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        logs: rows,
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

// Get cron job summary (for dashboard)
export const getCronJobSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get latest run for each job
    const jobs = ["daily_reminders", "trial_warnings", "upcoming_billing", "invoice_due_reminders", "monthly_billing", "trial_expiry", "overdue_invoices"];

    const summary = await Promise.all(
      jobs.map(async (jobName) => {
        const latest = await CronJobLog.findOne({
          where: { job_name: jobName },
          order: [["started_at", "DESC"]],
        });

        return {
          job_name: jobName,
          last_run: latest?.started_at || null,
          status: latest?.status || "never_run",
          duration_ms: latest?.duration_ms || 0,
          records_processed: latest?.records_processed || 0,
          records_success: latest?.records_success || 0,
          records_failed: latest?.records_failed || 0,
        };
      })
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

// Delete old logs (cleanup)
export const cleanupLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, days = 30 } = req.body;

    if (!["error_logs", "cron_job_logs", "all"].includes(type)) {
      throw new AppError("Invalid log type", 400);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(days));

    let errorLogsDeleted = 0;
    let cronLogsDeleted = 0;

    if (type === "error_logs" || type === "all") {
      errorLogsDeleted = await ErrorLog.destroy({
        where: {
          created_at: { [Op.lt]: cutoffDate },
        },
      });
    }

    if (type === "cron_job_logs" || type === "all") {
      cronLogsDeleted = await CronJobLog.destroy({
        where: {
          created_at: { [Op.lt]: cutoffDate },
        },
      });
    }

    logger.info("Logs cleanup completed", {
  requestId: req.id,
      type,
      days,
      error_logs_deleted: errorLogsDeleted,
      cron_logs_deleted: cronLogsDeleted,
    });

    res.json({
      success: true,
      message: "Logs cleanup completed",
      data: {
        error_logs_deleted: errorLogsDeleted,
        cron_logs_deleted: cronLogsDeleted,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
async function checkDatabaseHealth() {
  try {
    await db.sequelize.authenticate();
    return { status: "healthy", message: "Connected" };
  } catch (error) {
    return { status: "unhealthy", message: "Connection failed" };
  }
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
  };
}
