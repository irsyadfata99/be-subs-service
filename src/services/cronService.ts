import cron from "node-cron";
import { Op } from "sequelize";
import db from "../../models";
import { WhatsAppService } from "./whatsappService";
import { BillingService } from "./billingService";
import { addDays } from "../utils/helpers";
import logger from "../utils/logger";

const { Client, EndUser, Reminder } = db;

export class CronService {
  private whatsappService: WhatsAppService;
  private billingService: BillingService;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.billingService = new BillingService();
  }

  startDailyReminderJob() {
    cron.schedule(
      "0 9 * * *",
      async () => {
        logger.info("Running daily reminder job...");
        await this.sendAllReminders();
      },
      {
        timezone: "Asia/Jakarta",
      }
    );
    logger.info("Daily reminder job scheduled at 09:00 WIB");
  }

  startMonthlyBillingJob() {
    cron.schedule(
      "0 1 1 * *",
      async () => {
        logger.info("Running monthly billing job...");
        await this.billingService.generateAllMonthlyInvoices();
      },
      {
        timezone: "Asia/Jakarta",
      }
    );
    logger.info("Monthly billing job scheduled at 1st 01:00 WIB");
  }

  startTrialExpiryJob() {
    cron.schedule(
      "0 0 * * *",
      async () => {
        logger.info("Running trial expiry check...");
        await this.checkTrialExpiry();
      },
      {
        timezone: "Asia/Jakarta",
      }
    );
    logger.info("Trial expiry job scheduled at 00:00 WIB");
  }

  startOverdueInvoiceJob() {
    cron.schedule(
      "0 2 * * *",
      async () => {
        logger.info("Running overdue invoice check...");
        await this.checkOverdueInvoices();
      },
      {
        timezone: "Asia/Jakarta",
      }
    );
    logger.info("Overdue invoice job scheduled at 02:00 WIB");
  }

  private async sendAllReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.sendRemindersByType("before_3days", addDays(today, 3));
    await this.sendRemindersByType("before_1day", addDays(today, 1));
    await this.sendRemindersByType("overdue", addDays(today, -1));
    await this.updateOverdueStatus();
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

    for (const user of users) {
      try {
        const reminderData = {
          name: user.name,
          businessName: (user as any).client.business_name,
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
          client_id: (user as any).client_id,
          end_user_id: user.id,
          phone: user.phone,
          message: this.whatsappService.generateReminderMessage(reminderData),
          type: type,
          status: "sent",
          response: response,
          sent_at: new Date(),
        });

        await user.update({ last_reminder_sent: new Date() });

        logger.info(`Reminder sent to ${user.name} (${type})`);
      } catch (error: any) {
        logger.error(`Failed to send reminder to ${user.name}`, {
          error: error.message,
          type,
        });

        await Reminder.create({
          client_id: (user as any).client_id,
          end_user_id: user.id,
          phone: user.phone,
          message: "Failed to send",
          type: type,
          status: "failed",
          response: { error: error.message },
          sent_at: new Date(),
        });
      }
    }
  }

  private async updateOverdueStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await EndUser.update(
      { status: "overdue" },
      {
        where: {
          due_date: { [Op.lt]: today },
          status: "active",
        },
      }
    );
  }

  private async checkTrialExpiry() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredTrialClients = await Client.findAll({
      where: {
        status: "trial",
        trial_ends_at: { [Op.lte]: today },
      },
    });

    for (const client of expiredTrialClients) {
      await client.update({ status: "suspended" });

      if (client.phone) {
        const message = `Halo ${client.business_name},\n\nPeriode trial Anda telah berakhir. Mohon upgrade akun Anda untuk melanjutkan layanan.\n\nTerima kasih!`;
        try {
          await this.whatsappService.sendMessage(client.phone, message);
        } catch (error: any) {
          logger.error(
            `Failed to send trial expiry notice to ${client.business_name}`,
            {
              error: error.message,
            }
          );
        }
      }
    }

    logger.info(`Checked ${expiredTrialClients.length} trial expiry`);
  }

  private async checkOverdueInvoices() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await db.PlatformInvoice.findAll({
      where: {
        due_date: { [Op.lt]: today },
        status: "pending",
      },
      include: [{ model: Client, as: "client" }],
    });

    for (const invoice of overdueInvoices) {
      await invoice.update({ status: "overdue" });

      const client = (invoice as any).client;
      if (client) {
        await client.update({ status: "suspended" });

        if (client.phone) {
          const message = `Halo ${client.business_name},\n\nInvoice ${invoice.invoice_number} sudah melewati jatuh tempo. Akun Anda telah disuspend. Mohon segera lakukan pembayaran.\n\nTerima kasih!`;
          try {
            await this.whatsappService.sendMessage(client.phone, message);
          } catch (error: any) {
            logger.error(
              `Failed to send overdue notice to ${client.business_name}`,
              {
                error: error.message,
              }
            );
          }
        }
      }
    }

    logger.info(`Checked ${overdueInvoices.length} overdue invoices`);
  }

  startAll() {
    this.startDailyReminderJob();
    this.startMonthlyBillingJob();
    this.startTrialExpiryJob();
    this.startOverdueInvoiceJob();
  }
}
