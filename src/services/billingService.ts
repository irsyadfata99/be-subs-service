import { Op, Transaction } from "sequelize";
import db from "../../models";
import { TripayService } from "./tripayService";
import { WhatsAppService } from "./whatsappService";
import { PlatformSettingsService } from "./platformSettingsService"; // ADD THIS
import { generateInvoiceNumber, addDays } from "../utils/helpers";
import logger from "../utils/logger";

const { Client, EndUser, PlatformInvoice } = db;

export class BillingService {
  private tripayService: TripayService;
  private whatsappService: WhatsAppService;
  private settingsService: PlatformSettingsService;

  constructor() {
    this.tripayService = new TripayService();
    this.whatsappService = new WhatsAppService();
    this.settingsService = new PlatformSettingsService();
  }

  async generateMonthlyInvoice(clientId: number): Promise<any> {
    // Start transaction
    const t: Transaction = await db.sequelize.transaction();

    try {
      const client = await Client.findByPk(clientId, { transaction: t });
      if (!client) {
        await t.rollback();
        throw new Error("Client not found");
      }

      if (client.status === "trial") {
        await t.rollback();
        return { message: "Client is in trial period, no invoice generated" };
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const existingInvoice = await PlatformInvoice.findOne({
        where: {
          client_id: clientId,
          period_month: month,
          period_year: year,
        },
        transaction: t,
      });

      if (existingInvoice) {
        await t.rollback();
        throw new Error("Invoice for this period already exists");
      }

      const activeUsers = await EndUser.count({
        where: {
          client_id: clientId,
          status: { [Op.in]: ["active", "overdue"] },
        },
        transaction: t,
      });

      if (activeUsers === 0) {
        await t.rollback();
        return { message: "No active users, no invoice generated" };
      }

      const pricePerUser = await this.settingsService.getPricePerUser();
      const totalAmount = activeUsers * pricePerUser;
      const invoiceNumber = generateInvoiceNumber("PINV");
      const dueDate = addDays(now, 7);

      const invoice = await PlatformInvoice.create(
        {
          client_id: clientId,
          invoice_number: invoiceNumber,
          period_month: month,
          period_year: year,
          total_users: activeUsers,
          price_per_user: pricePerUser,
          total_amount: totalAmount,
          due_date: dueDate,
          status: "pending",
        },
        { transaction: t }
      );

      // Create Tripay payment
      const tripayResponse = await this.tripayService.createPayment({
        amount: totalAmount,
        customerName: client.business_name,
        customerEmail: client.email,
        customerPhone: client.phone || "628123456789",
        orderItems: [
          {
            name: `Platform Fee - ${month}/${year}`,
            price: pricePerUser,
            quantity: activeUsers,
          },
        ],
      });

      // Update invoice with Tripay data
      await invoice.update(
        {
          tripay_reference: tripayResponse.reference,
          tripay_merchant_ref: tripayResponse.merchant_ref,
          payment_method: tripayResponse.payment_method,
          checkout_url: tripayResponse.checkout_url,
          pay_code: tripayResponse.pay_code,
          total_fee: tripayResponse.total_fee,
          amount_received: tripayResponse.amount_received,
          expired_at: new Date(tripayResponse.expired_time * 1000),
        },
        { transaction: t }
      );

      // Commit transaction
      await t.commit();

      // Send WhatsApp (outside transaction)
      if (client.phone) {
        try {
          await this.whatsappService.sendPlatformInvoice(client.phone, client.business_name, invoiceNumber, totalAmount, tripayResponse.checkout_url);
        } catch (error: any) {
          logger.error("Failed to send WhatsApp invoice notification", {
            error: error.message,
            clientId,
          });
        }
      }

      return {
        invoice: invoice.toJSON(),
        payment: tripayResponse,
      };
    } catch (error: any) {
      await t.rollback();
      logger.error("Failed to generate monthly invoice", {
        error: error.message,
        clientId,
      });
      throw error;
    }
  }

  async processPaymentCallback(callbackData: any): Promise<any> {
    const t: Transaction = await db.sequelize.transaction();

    try {
      const { merchant_ref, status } = callbackData;

      const invoice = await PlatformInvoice.findOne({
        where: { tripay_merchant_ref: merchant_ref },
        transaction: t,
      });

      if (!invoice) {
        await t.rollback();
        throw new Error("Invoice not found");
      }

      const statusMap: { [key: string]: string } = {
        PAID: "paid",
        EXPIRED: "expired",
        FAILED: "cancelled",
      };

      const newStatus = statusMap[status] || "pending";

      await invoice.update(
        {
          status: newStatus,
          paid_at: status === "PAID" ? new Date() : null,
        },
        { transaction: t }
      );

      if (status === "PAID") {
        const client = await Client.findByPk(invoice.client_id, {
          transaction: t,
        });
        if (client && client.status === "suspended") {
          await client.update({ status: "active" }, { transaction: t });
        }
      }

      await t.commit();

      logger.info("Payment callback processed", {
        merchant_ref,
        status: newStatus,
      });

      return invoice;
    } catch (error: any) {
      await t.rollback();
      logger.error("Failed to process payment callback", {
        error: error.message,
        callbackData,
      });
      throw error;
    }
  }

  async generateAllMonthlyInvoices(): Promise<any> {
    const clients = await Client.findAll({
      where: {
        status: { [Op.ne]: "trial" },
      },
    });

    const results: Array<{
      clientId: number;
      success: boolean;
      data?: any;
      error?: string;
    }> = [];

    for (const client of clients) {
      try {
        const result = await this.generateMonthlyInvoice(client.id);
        results.push({ clientId: client.id, success: true, data: result });
      } catch (error: any) {
        results.push({
          clientId: client.id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}
