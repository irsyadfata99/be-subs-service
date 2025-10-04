import cron from "node-cron";
import { Op } from "sequelize";
import db from "../../models";
import { WhatsAppService } from "./whatsappService.ts.backup";
import { BillingService } from "./billingService";
import { LoggingService } from "./loggingService";
import { addDays, formatDate } from "../utils/helpers";
import logger from "../utils/logger";
import pLimit from "p-limit";

const { Client, EndUser, Reminder, PlatformInvoice } = db;

export class CronService {
  private whatsappService: WhatsAppService;
  private billingService: BillingService;
  private concurrencyLimit = 10;
  private jobLocks: Map<string, boolean> = new Map();

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.billingService = new BillingService();
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

      if (heapUsedMB > 400) {
        logger.warn("High memory usage detected", {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        });
      }

      // ✅ ADDED: Log memory every 5 minutes (was missing the log)
      logger.info("Memory usage check", {
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      });
    }, 300000); // ✅ Every 5 minutes instead of 1 minute
  }

  private async runJobWithLock(
    jobName: string,
    jobFunction: () => Promise<void>
  ) {
    if (this.jobLocks.get(jobName)) {
      logger.warn(`Job ${jobName} already running, skipping...`);
      return;
    }

    this.jobLocks.set(jobName, true);
    const jobLog = await LoggingService.startCronJob(jobName);

    try {
      await jobFunction();

      if (jobLog) {
        await LoggingService.completeCronJob(jobLog.id, "success", {});
      }
    } catch (error: any) {
      logger.error(`Job ${jobName} failed`, { error: error.message });

      await LoggingService.logError(
        "cronService",
        `${jobName} failed: ${error.message}`,
        "error",
        undefined,
        error.stack
      );

      if (jobLog) {
        await LoggingService.completeCronJob(jobLog.id, "failed", {
          error_message: error.message,
        });
      }
    } finally {
      this.jobLocks.set(jobName, false);
    }
  }

  startInvoiceGenerationJob() {
    cron.schedule(
      "0 1 * * *",
      async () => {
        logger.info("📋 Running H-7 invoice generation...");
        await this.billingService.generateUpcomingInvoices();
      },
      { timezone: "Asia/Jakarta" }
    );
    logger.info("✅ Invoice generation job scheduled at 01:00 WIB");
  }

  startDailyReminderJob() {
    cron.schedule(
      "0 9 * * *",
      async () => {
        logger.info("🔔 Running daily reminder job...");
        await this.runJobWithLock("daily_reminders", () =>
          this.sendAllReminders()
        );
      },
      { timezone: "Asia/Jakarta" }
    );
    logger.info("✅ Daily reminder job scheduled at 09:00 WIB");
  }

  startTrialWarningJob() {
    cron.schedule(
      "0 9 * * *",
      async () => {
        logger.info("⚠️ Running trial warning job...");
        await this.runJobWithLock("trial_warnings", () =>
          this.sendTrialWarnings()
        );
      },
      { timezone: "Asia/Jakarta" }
    );
    logger.info("✅ Trial warning job scheduled at 09:00 WIB");
  }

  startInvoiceRemindersJob() {
    cron.schedule(
      "0 9 * * *",
      async () => {
        logger.info("📢 Running invoice & billing reminders...");
        await this.sendInvoiceReminders();
      },
      { timezone: "Asia/Jakarta" }
    );
    logger.info("✅ Invoice reminders job scheduled at 09:00 WIB");
  }

  startMonthlyBillingJob() {
    cron.schedule(
      "0 1 * * *",
      async () => {
        const today = new Date().getDate();
        logger.info(`Running monthly billing for date: ${today}`);

        const activeClients = await Client.findAll({
          where: {
            status: "active",
            billing_date: today,
            role: "client",
            total_users: { [Op.gt]: 0 },
          },
        });

        logger.info(
          `Found ${activeClients.length} clients to bill on date ${today}`
        );

        for (const client of activeClients) {
          try {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            const existingInvoice = await PlatformInvoice.findOne({
              where: {
                client_id: client.id,
                period_month: currentMonth,
                period_year: currentYear,
              },
            });

            if (existingInvoice) {
              logger.info(`Invoice already exists for client ${client.id}`);
              continue;
            }

            await this.billingService.generateMonthlyInvoice(client.id);
            logger.info(`Invoice generated for ${client.business_name}`);
          } catch (error: any) {
            logger.error(`Failed to bill client ${client.id}`, {
              error: error.message,
            });
          }
        }
      },
      { timezone: "Asia/Jakarta" }
    );

    logger.info("✅ Daily billing job scheduled at 01:00 WIB");
  }

  startTrialExpiryJob() {
    cron.schedule(
      "0 0 * * *",
      async () => {
        logger.info("🔍 Running trial expiry check...");
        await this.checkTrialExpiry();
      },
      { timezone: "Asia/Jakarta" }
    );
    logger.info("✅ Trial expiry job scheduled at 00:00 WIB");
  }

  startOverdueInvoiceJob() {
    cron.schedule(
      "0 2 * * *",
      async () => {
        logger.info("📋 Running overdue invoice check...");
        await this.checkOverdueInvoices();
      },
      { timezone: "Asia/Jakarta" }
    );
    logger.info("✅ Overdue invoice job scheduled at 02:00 WIB");
  }

  /**
   * ✅ OPTIMIZED: Send trial warnings using proper WhatsApp methods
   */
  private async sendTrialWarnings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDays = [7, 3, 1];

    for (const days of warningDays) {
      const targetDate = addDays(today, days);
      const clients = await Client.findAll({
        where: {
          status: "trial",
          trial_ends_at: {
            [Op.gte]: targetDate,
            [Op.lt]: addDays(targetDate, 1),
            [Op.gt]: new Date(),
          },
        },
      });

      logger.info(
        `📢 Sending H-${days} trial warnings to ${clients.length} clients`
      );

      for (const client of clients) {
        try {
          if (!client.contact_whatsapp) {
            logger.info(
              `⏭️ Skipping ${client.business_name} (no WhatsApp number)`
            );
            continue;
          }

          const pendingInvoice = await PlatformInvoice.findOne({
            where: {
              client_id: client.id,
              status: "pending",
            },
            order: [["created_at", "DESC"]],
          });

          if (pendingInvoice) {
            await this.whatsappService.sendTrialWarningWithInvoice(
              client.contact_whatsapp,
              client.business_name,
              days,
              pendingInvoice.invoice_number,
              parseFloat(pendingInvoice.total_amount.toString()),
              new Date(pendingInvoice.due_date),
              pendingInvoice.tripay_payment_url || "",
              client.billing_date
            );

            logger.info(
              `✅ Trial warning + invoice sent to ${client.business_name} (H-${days})`
            );
          } else {
            await this.whatsappService.sendTrialWarning(
              client.contact_whatsapp,
              client.business_name,
              days,
              parseFloat(client.monthly_bill.toString())
            );

            logger.info(
              `✅ Trial warning sent to ${client.business_name} (H-${days}) - Invoice not ready yet`
            );
          }
        } catch (error: any) {
          logger.error(
            `❌ Failed to send trial warning to ${client.business_name}`,
            { error: error.message }
          );
        }
      }
    }
  }

  /**
   * ✅ FIXED #1: Skip trial clients to avoid duplicate notifications
   */
  private async sendInvoiceReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysToCheck = [7, 3, 1];

    for (const days of daysToCheck) {
      const targetDate = addDays(today, days);

      const invoices = await PlatformInvoice.findAll({
        where: {
          status: "pending",
          due_date: {
            [Op.gte]: targetDate,
            [Op.lt]: addDays(targetDate, 1),
          },
        },
        include: [{ model: Client, as: "client" }],
      });

      logger.info(
        `📤 Sending H-${days} invoice reminders for ${invoices.length} invoices`
      );

      for (const invoice of invoices) {
        try {
          const client = (invoice as any).client;
          if (!client?.contact_whatsapp) {
            logger.info(
              `⏭️ Skipping invoice ${invoice.invoice_number} (no WhatsApp)`
            );
            continue;
          }

          // ✅ FIX #1: Skip trial clients (already handled by trial warnings)
          if (client.status === "trial") {
            logger.info(
              `⏭️ Skipping ${client.business_name} (trial client already notified)`
            );
            continue;
          }

          await this.whatsappService.sendInvoiceAndBillingReminder(
            client.contact_whatsapp,
            client.business_name,
            invoice.invoice_number,
            parseFloat(invoice.total_amount.toString()),
            new Date(invoice.due_date),
            days,
            invoice.tripay_payment_url || "",
            client.billing_date
          );

          logger.info(
            `✅ Invoice reminder sent to ${client.business_name} (H-${days})`
          );
        } catch (error: any) {
          logger.error(`❌ Failed to send invoice reminder`, {
            invoice: invoice.invoice_number,
            error: error.message,
          });
        }
      }
    }
  }

  private async sendAllReminders() {
    const jobLog = await LoggingService.startCronJob("daily_reminders");

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalFailed = 0;

      await this.sendRemindersByType("before_3days", addDays(today, 3));
      await this.sendRemindersByType("before_1day", addDays(today, 1));
      await this.sendRemindersByType("overdue", addDays(today, -1));
      await this.updateOverdueStatus();

      logger.info("Daily reminders completed");

      if (jobLog) {
        await LoggingService.completeCronJob(jobLog.id, "success", {
          records_processed: totalProcessed,
          records_success: totalSuccess,
          records_failed: totalFailed,
        });
      }
    } catch (error: any) {
      logger.error("Daily reminders failed", { error: error.message });

      await LoggingService.logError(
        "cronService",
        `Daily reminders failed: ${error.message}`,
        "error",
        undefined,
        error.stack
      );

      if (jobLog) {
        await LoggingService.completeCronJob(jobLog.id, "failed", {
          error_message: error.message,
        });
      }
    }
  }

  private async sendRemindersByType(type: string, targetDate: Date) {
    const users = await EndUser.findAll({
      where: {
        due_date: targetDate,
        status: { [Op.in]: ["active", "overdue"] },
      },
      include: [
        {
          model: Client,
          as: "client",
          where: { status: { [Op.in]: ["trial", "active"] } },
        },
      ],
    });

    logger.info(`📤 Sending ${type} reminders to ${users.length} users`);
    const limit = pLimit(this.concurrencyLimit);

    const results = await Promise.allSettled(
      users.map((user) =>
        limit(async () => {
          try {
            const client = (user as any).client;
            const reminderData = {
              name: user.name,
              businessName: client.business_name,
              contactWhatsApp: client.contact_whatsapp || undefined,
              packageName: user.package_name,
              packagePrice: parseFloat(user.package_price.toString()),
              dueDate: new Date(user.due_date),
              type: type as "before_3days" | "before_1day" | "overdue",
              phone: user.phone,
            };

            const response = await this.whatsappService.sendPaymentReminder(
              reminderData
            );

            await Reminder.create({
              client_id: client.id,
              end_user_id: user.id,
              phone: user.phone,
              message:
                this.whatsappService.generateReminderMessage(reminderData),
              type: type,
              status: "sent",
              response: response,
              sent_at: new Date(),
            });

            await user.update({ last_reminder_sent: new Date() });
            logger.info(`✅ Reminder sent to ${user.name} (${type})`);
            return { success: true, user: user.name };
          } catch (error: any) {
            logger.error(`❌ Failed to send reminder to ${user.name}`, {
              error: error.message,
              type,
            });
            await Reminder.create({
              client_id: (user as any).client.id,
              end_user_id: user.id,
              phone: user.phone,
              message: "Failed to send",
              type: type,
              status: "failed",
              response: { error: error.message },
              sent_at: new Date(),
            });
            return { success: false, user: user.name, error: error.message };
          }
        })
      )
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).success
    ).length;
    const failed = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !(r.value as any).success)
    ).length;
    logger.info(`📊 ${type} summary: ${successful} sent, ${failed} failed`);
  }

  private async updateOverdueStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updated = await EndUser.update(
      { status: "overdue" },
      { where: { due_date: { [Op.lt]: today }, status: "active" } }
    );

    logger.info(`✅ Updated ${updated[0]} users to overdue status`);
  }

  /**
   * ✅ FIXED #6: Improved trial expiry message tone
   */
  private async checkTrialExpiry() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = addDays(today, 7);
    const clientsNearingExpiry = await Client.findAll({
      where: {
        status: "trial",
        trial_ends_at: {
          [Op.gte]: sevenDaysFromNow,
          [Op.lt]: addDays(sevenDaysFromNow, 1),
        },
        role: "client",
      },
    });

    logger.info(
      `📋 Found ${clientsNearingExpiry.length} clients with trial ending in 7 days`
    );

    for (const client of clientsNearingExpiry) {
      try {
        const result = await this.billingService.generateOrGetTrialInvoice(
          client.id
        );

        if (client.contact_whatsapp && result.invoice) {
          await this.whatsappService.sendTrialWarningWithInvoice(
            client.contact_whatsapp,
            client.business_name,
            7,
            result.invoice.invoice_number,
            parseFloat(result.invoice.total_amount.toString()),
            new Date(result.invoice.due_date),
            result.invoice.tripay_payment_url || "",
            client.billing_date
          );
        }
      } catch (error: any) {
        logger.error(`❌ Failed to process H-7 for ${client.business_name}`, {
          error: error.message,
        });
      }
    }

    const expiredTrialClients = await Client.findAll({
      where: {
        status: "trial",
        trial_ends_at: { [Op.lte]: today },
        role: "client",
      },
    });

    logger.info(`🔍 Found ${expiredTrialClients.length} expired trial clients`);

    for (const client of expiredTrialClients) {
      try {
        await this.billingService.generateOrGetTrialInvoice(client.id);

        await client.update({ status: "suspended" });
        logger.info(
          `🚨 Client ${client.business_name} suspended (trial expired)`
        );

        if (client.contact_whatsapp) {
          // ✅ FIX #6: Use softer message tone for trial expiry
          await this.whatsappService.sendTrialExpired(
            client.contact_whatsapp,
            client.business_name
          );
        }
      } catch (error: any) {
        logger.error(
          `❌ Failed to process trial expiry for ${client.business_name}`,
          {
            error: error.message,
          }
        );
      }
    }
  }

  private async checkOverdueInvoices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await PlatformInvoice.findAll({
      where: {
        due_date: { [Op.lt]: today },
        status: "pending",
      },
      include: [{ model: Client, as: "client" }],
    });

    logger.info(`🚨 Found ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      const client = (invoice as any).client;

      if (client && client.status !== "suspended") {
        await client.update({ status: "suspended" });
        await invoice.update({ status: "overdue" });

        logger.info(`🚨 Client ${client.business_name} SUSPENDED (overdue)`);

        if (client.contact_whatsapp) {
          await this.whatsappService.sendAccountSuspended(
            client.contact_whatsapp,
            client.business_name,
            "invoice belum dibayar"
          );
        }
      }
    }
  }

  startAll() {
    this.startDailyReminderJob();
    this.startTrialWarningJob();
    this.startInvoiceRemindersJob();
    this.startInvoiceGenerationJob();
    this.startMonthlyBillingJob();
    this.startTrialExpiryJob();
    this.startOverdueInvoiceJob();

    logger.info("✅ All cron jobs started");
  }
}
