import { Op } from "sequelize";
import db from "../../models";
import { TripayService } from "./tripayService";
import { WhatsAppService } from "./whatsappService";
import { generateInvoiceNumber, addDays } from "../utils/helpers";

const { Client, EndUser, PlatformInvoice } = db;

export class BillingService {
  private tripayService: TripayService;
  private whatsappService: WhatsAppService;

  constructor() {
    this.tripayService = new TripayService();
    this.whatsappService = new WhatsAppService();
  }

  async generateMonthlyInvoice(clientId: number): Promise<any> {
    const client = await Client.findByPk(clientId);
    if (!client) throw new Error("Client not found");

    // Skip trial clients
    if (client.status === "trial") {
      return { message: "Client is in trial period, no invoice generated" };
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Check if invoice already exists
    const existingInvoice = await PlatformInvoice.findOne({
      where: {
        client_id: clientId,
        period_month: month,
        period_year: year,
      },
    });

    if (existingInvoice) {
      throw new Error("Invoice for this period already exists");
    }

    // Count active users
    const activeUsers = await EndUser.count({
      where: {
        client_id: clientId,
        status: { [Op.in]: ["active", "overdue"] },
      },
    });

    if (activeUsers === 0) {
      return { message: "No active users, no invoice generated" };
    }

    const pricePerUser = 3000;
    const totalAmount = activeUsers * pricePerUser;
    const invoiceNumber = generateInvoiceNumber("PINV");
    const dueDate = addDays(now, 7); // 7 days payment due

    // Create invoice
    const invoice = await PlatformInvoice.create({
      client_id: clientId,
      invoice_number: invoiceNumber,
      period_month: month,
      period_year: year,
      total_users: activeUsers,
      price_per_user: pricePerUser,
      total_amount: totalAmount,
      due_date: dueDate,
      status: "pending",
    });

    // Create Tripay payment
    try {
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
      await invoice.update({
        tripay_reference: tripayResponse.reference,
        tripay_merchant_ref: tripayResponse.merchant_ref,
        payment_method: tripayResponse.payment_method,
        checkout_url: tripayResponse.checkout_url,
        pay_code: tripayResponse.pay_code,
        total_fee: tripayResponse.total_fee,
        amount_received: tripayResponse.amount_received,
        expired_at: new Date(tripayResponse.expired_time * 1000),
      });

      // Send WhatsApp notification
      if (client.phone) {
        await this.whatsappService.sendPlatformInvoice(
          client.phone,
          client.business_name,
          invoiceNumber,
          totalAmount,
          tripayResponse.checkout_url
        );
      }

      return {
        invoice: invoice.toJSON(),
        payment: tripayResponse,
      };
    } catch (error: any) {
      console.error("Failed to create Tripay payment:", error.message);
      // Invoice created but payment failed
      return {
        invoice: invoice.toJSON(),
        error: "Failed to create payment link",
      };
    }
  }

  async processPaymentCallback(callbackData: any): Promise<any> {
    const { merchant_ref, status, reference } = callbackData;

    const invoice = await PlatformInvoice.findOne({
      where: { tripay_merchant_ref: merchant_ref },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Update invoice status based on Tripay status
    const statusMap: { [key: string]: string } = {
      PAID: "paid",
      EXPIRED: "expired",
      FAILED: "cancelled",
    };

    const newStatus = statusMap[status] || "pending";

    await invoice.update({
      status: newStatus,
      paid_at: status === "PAID" ? new Date() : null,
    });

    // If paid, activate client
    if (status === "PAID") {
      const client = await Client.findByPk(invoice.client_id);
      if (client && client.status === "suspended") {
        await client.update({ status: "active" });
      }
    }

    return invoice;
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
