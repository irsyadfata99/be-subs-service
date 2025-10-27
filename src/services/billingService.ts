import { Op, Transaction } from "sequelize";
import db from "../../models";
import axios from "axios";
import crypto from "crypto";
import { TripayService } from "./tripayService";
import { WhatsAppService } from "./whatsappService";
import { PlatformSettingsService } from "./platformSettingsService";
import { generateInvoiceNumber, addDays } from "../utils/helpers";
import logger from "../utils/logger";

const { Client, EndUser, PlatformInvoice } = db;

export class BillingService {
  private tripayApiKey: string;
  private tripayPrivateKey: string;
  private tripayMerchantCode: string;
  private tripayBaseUrl: string;
  private tripayService: TripayService;
  private whatsappService: WhatsAppService;
  private settingsService: PlatformSettingsService;

  constructor() {
    this.tripayApiKey = process.env.TRIPAY_API_KEY || "";
    this.tripayPrivateKey = process.env.TRIPAY_PRIVATE_KEY || "";
    this.tripayMerchantCode = process.env.TRIPAY_MERCHANT_CODE || "";
    this.tripayBaseUrl = process.env.TRIPAY_MODE === "production" ? "https://tripay.co.id/api" : "https://tripay.co.id/api-sandbox";

    this.tripayService = new TripayService();
    this.whatsappService = new WhatsAppService();
    this.settingsService = new PlatformSettingsService();
  }

  async generateMonthlyInvoice(clientId: number): Promise<any> {
    const t: Transaction = await db.sequelize.transaction();

    try {
      const client = await Client.findByPk(clientId, { transaction: t });
      if (!client) {
        await t.rollback();
        throw new Error("Client not found");
      }

      if (client.role === "admin" || client.role === "super_admin") {
        await t.rollback();
        return { message: `${client.role} - no billing required` };
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
          payment_method_selected: null,
        },
        { transaction: t }
      );

      await t.commit();

      logger.info("Monthly invoice generated (no payment yet)", {
        clientId,
        invoiceNumber,
        totalAmount,
      });

      return {
        invoice: invoice.toJSON(),
        message: "Invoice created. User needs to select payment method.",
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

  async generateOrGetTrialInvoice(clientId: number) {
    const t: Transaction = await db.sequelize.transaction();

    try {
      const client = await Client.findByPk(clientId, { transaction: t });
      if (!client) {
        await t.rollback();
        throw new Error("Client not found");
      }

      const existingInvoice = await PlatformInvoice.findOne({
        where: {
          client_id: clientId,
          status: { [Op.in]: ["pending", "paid"] },
        },
        order: [["created_at", "DESC"]],
        transaction: t,
      });

      if (existingInvoice) {
        await t.commit();
        logger.info(`Invoice already exists for client ${clientId}`);
        return { invoice: existingInvoice, message: "Invoice already exists" };
      }

      const now = new Date();
      const trialEndsAt = new Date(client.trial_ends_at);
      const invoiceNumber = generateInvoiceNumber("PINV");
      const dueDate = trialEndsAt;

      const invoice = await PlatformInvoice.create(
        {
          client_id: clientId,
          invoice_number: invoiceNumber,
          period_month: now.getMonth() + 1,
          period_year: now.getFullYear(),
          total_users: client.total_users,
          price_per_user: 3000,
          total_amount: client.monthly_bill,
          due_date: dueDate,
          status: "pending",
          payment_method_selected: null,
        },
        { transaction: t }
      );

      await t.commit();

      logger.info(`Trial invoice created`, {
        clientId,
        invoiceNumber,
      });

      return { invoice };
    } catch (error: any) {
      await t.rollback();
      logger.error("Failed to generate trial invoice", {
        error: error.message,
        clientId,
      });
      throw error;
    }
  }

  async generateUpcomingInvoices(): Promise<void> {
    try {
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);
      const targetBillingDate = sevenDaysFromNow.getDate();

      logger.info(`🔍 Checking for clients with billing date: ${targetBillingDate}`);

      const clients = await Client.findAll({
        where: {
          status: "active",
          billing_date: targetBillingDate,
          role: "client",
          total_users: { [Op.gt]: 0 },
        },
      });

      logger.info(`📋 Found ${clients.length} clients for H-7 invoice generation`);

      for (const client of clients) {
        try {
          const now = new Date();
          const nextMonth = new Date(sevenDaysFromNow);
          const periodMonth = nextMonth.getMonth() + 1;
          const periodYear = nextMonth.getFullYear();

          const existingInvoice = await PlatformInvoice.findOne({
            where: {
              client_id: client.id,
              period_month: periodMonth,
              period_year: periodYear,
            },
          });

          if (existingInvoice) {
            logger.info(`⏭️ Invoice already exists for ${client.business_name} (${periodMonth}/${periodYear})`);
            continue;
          }

          const result = await this.generateMonthlyInvoice(client.id);

          logger.info(`✅ H-7 invoice generated for ${client.business_name}`, {
            invoiceNumber: result.invoice?.invoice_number,
            totalAmount: result.invoice?.total_amount,
          });
        } catch (error: any) {
          logger.error(`❌ Failed to generate H-7 invoice for client ${client.id}`, {
            error: error.message,
            businessName: client.business_name,
          });
        }
      }

      logger.info(`✅ H-7 invoice generation completed`);
    } catch (error: any) {
      logger.error("Failed to generate upcoming invoices", {
        error: error.message,
      });
      throw error;
    }
  }

  async createPaymentForInvoice(invoiceId: number, clientId: number, paymentMethod: "BCA_VA" | "QRIS"): Promise<any> {
    const t: Transaction = await db.sequelize.transaction();

    try {
      const invoice = await PlatformInvoice.findOne({
        where: {
          id: invoiceId,
          client_id: clientId,
        },
        include: [{ model: Client, as: "client" }],
        transaction: t,
      });

      if (!invoice) {
        await t.rollback();
        throw new Error("Invoice not found");
      }

      if (invoice.status !== "pending") {
        await t.rollback();
        throw new Error("Invoice is not pending");
      }

      if (invoice.payment_method_selected && invoice.tripay_expired_time) {
        const expiredTime = new Date(invoice.tripay_expired_time);
        const now = new Date();

        if (expiredTime > now) {
          if (invoice.payment_method_selected === paymentMethod) {
            await t.rollback();
            logger.info(`Payment already exists for invoice ${invoice.invoice_number}`);
            return {
              message: "Payment already exists and still valid",
              data: {
                invoice: invoice.toJSON(),
                payment: {
                  tripay_reference: invoice.tripay_reference,
                  tripay_payment_url: invoice.tripay_payment_url,
                  tripay_qr_url: invoice.tripay_qr_url,
                  tripay_va_number: invoice.tripay_va_number,
                  tripay_expired_time: invoice.tripay_expired_time,
                },
              },
            };
          } else {
            await t.rollback();
            throw new Error("Payment with different method already exists. Please cancel current payment first.");
          }
        }
      }

      logger.info(`Creating ${paymentMethod} payment for invoice ${invoice.invoice_number}`);

      const paymentData = await this.createTripayPayment(invoiceId, paymentMethod);

      await invoice.update(
        {
          payment_method_selected: paymentMethod,
          tripay_reference: paymentData.reference,
          tripay_merchant_ref: paymentData.merchant_ref,
          tripay_payment_url: paymentData.checkout_url,
          tripay_qr_url: paymentMethod === "QRIS" ? paymentData.qr_url : null,
          tripay_va_number: paymentMethod === "BCA_VA" ? paymentData.pay_code : null,
          tripay_expired_time: new Date(paymentData.expired_time * 1000),
        },
        { transaction: t }
      );

      await t.commit();

      logger.info(`✅ Payment created for invoice ${invoice.invoice_number}: ${paymentMethod}`);

      return {
        message: "Payment created successfully",
        data: {
          invoice: invoice.toJSON(),
          payment: {
            tripay_reference: paymentData.reference,
            tripay_payment_url: paymentData.checkout_url,
            tripay_qr_url: paymentMethod === "QRIS" ? paymentData.qr_url : null,
            tripay_va_number: paymentMethod === "BCA_VA" ? paymentData.pay_code : null,
            tripay_expired_time: new Date(paymentData.expired_time * 1000),
          },
        },
      };
    } catch (error: any) {
      await t.rollback();
      logger.error("Failed to create payment for invoice", {
        error: error.message,
        invoiceId,
        clientId,
      });
      throw error;
    }
  }

  async createTripayPayment(invoiceId: number, paymentMethod: "BCA_VA" | "QRIS") {
    try {
      const invoice = await PlatformInvoice.findByPk(invoiceId, {
        include: [{ model: Client, as: "client" }],
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const client = (invoice as any).client;
      const methodCode = paymentMethod === "BCA_VA" ? "BRIVA" : "QRIS";
      const merchantRef = `${invoice.invoice_number}-${Date.now()}`;

      const data = {
        method: methodCode,
        merchant_ref: merchantRef,
        amount: invoice.total_amount,
        customer_name: client.business_name,
        customer_email: client.email,
        customer_phone: client.contact_whatsapp || client.contact_phone || "",
        order_items: [
          {
            name: `Platform Subscription - ${client.business_name}`,
            price: invoice.total_amount,
            quantity: 1,
          },
        ],
        return_url: `${process.env.FRONTEND_URL}/billing?invoice=${invoice.invoice_number}`,
        expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        signature: this.generateSignature(merchantRef, invoice.total_amount),
      };

      const response = await axios.post(`${this.tripayBaseUrl}/transaction/create`, data, {
        headers: {
          Authorization: `Bearer ${this.tripayApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to create payment");
      }

      logger.info(`Tripay payment created: ${response.data.data.reference}`);

      return response.data.data;
    } catch (error: any) {
      logger.error("Tripay API error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create Tripay payment");
    }
  }

  private generateSignature(merchantRef: string, amount: number): string {
    const data = `${this.tripayMerchantCode}${merchantRef}${amount}`;
    return crypto.createHmac("sha256", this.tripayPrivateKey).update(data).digest("hex");
  }

  async regeneratePayment(invoiceId: number, clientId: number): Promise<any> {
    const t: Transaction = await db.sequelize.transaction();

    try {
      const invoice = await PlatformInvoice.findOne({
        where: { id: invoiceId, client_id: clientId, status: "pending" },
        include: [{ model: Client, as: "client" }],
        transaction: t,
      });

      if (!invoice) {
        await t.rollback();
        throw new Error("Invoice not found");
      }

      if (!invoice.payment_method_selected) {
        await t.rollback();
        throw new Error("No payment method selected");
      }

      const paymentData = await this.createTripayPayment(invoiceId, invoice.payment_method_selected as "BCA_VA" | "QRIS");

      await invoice.update(
        {
          tripay_reference: paymentData.reference,
          tripay_merchant_ref: paymentData.merchant_ref,
          tripay_payment_url: paymentData.checkout_url,
          tripay_qr_url: invoice.payment_method_selected === "QRIS" ? paymentData.qr_url : null,
          tripay_va_number: invoice.payment_method_selected === "BCA_VA" ? paymentData.pay_code : null,
          tripay_expired_time: new Date(paymentData.expired_time * 1000),
        },
        { transaction: t }
      );

      await t.commit();

      logger.info("Payment regenerated", { invoiceId });

      return {
        invoice: invoice.toJSON(),
        payment: paymentData,
      };
    } catch (error: any) {
      await t.rollback();
      logger.error("Failed to regenerate payment", { error: error.message });
      throw error;
    }
  }

  async refreshQRCode(invoiceId: number, clientId: number): Promise<any> {
    const invoice = await PlatformInvoice.findOne({
      where: { id: invoiceId, client_id: clientId, status: "pending" },
      include: [{ model: Client, as: "client" }],
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.payment_method_selected !== "QRIS") {
      throw new Error("Only QRIS payment can be refreshed");
    }

    const paymentData = await this.createTripayPayment(invoiceId, "QRIS");

    await invoice.update({
      tripay_reference: paymentData.reference,
      tripay_qr_url: paymentData.qr_url,
      tripay_expired_time: new Date(paymentData.expired_time * 1000),
    });

    logger.info("QRIS QR code refreshed", { invoiceId });

    return {
      qr_url: paymentData.qr_url,
      expired_time: paymentData.expired_time,
    };
  }

  /**
   * ✅ FIXED #3, #11, #12: Added WhatsApp notifications for payment events
   */
  async processPaymentCallback(callbackData: any): Promise<any> {
    const t: Transaction = await db.sequelize.transaction();

    try {
      const { merchant_ref, status } = callbackData;

      const invoice = await PlatformInvoice.findOne({
        where: { tripay_merchant_ref: merchant_ref },
        include: [{ model: Client, as: "client" }],
        transaction: t,
      });

      if (!invoice) {
        await t.rollback();
        throw new Error("Invoice not found");
      }

      const client = (invoice as any).client;
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

      // ✅ FIX #3: Send payment confirmation WhatsApp
      if (status === "PAID") {
        const wasClientSuspended = client.status === "suspended" || client.status === "trial";

        if (wasClientSuspended) {
          await client.update({ status: "active" }, { transaction: t });
        }

        await t.commit();

        // Send payment confirmation
        if (client.contact_whatsapp) {
          await this.whatsappService.sendPaymentConfirmation(client.contact_whatsapp, client.business_name, invoice.invoice_number, parseFloat(invoice.total_amount.toString()), new Date());

          logger.info(`✅ Payment confirmation sent to ${client.business_name}`);
        }

        // ✅ FIX #12: Send reactivation notification if was suspended
        if (wasClientSuspended && client.contact_whatsapp) {
          await this.whatsappService.sendAccountActivated(client.contact_whatsapp, client.business_name);

          logger.info(`✅ Reactivation notification sent to ${client.business_name}`);
        }

        logger.info(`✅ Payment confirmed for invoice ${invoice.invoice_number}`);
      }
      // ✅ FIX #11: Send payment expired notification
      else if (status === "EXPIRED") {
        await t.commit();

        if (client.contact_whatsapp) {
          await this.whatsappService.sendPaymentExpired(client.contact_whatsapp, client.business_name, invoice.invoice_number);

          logger.info(`⏰ Payment expired notification sent to ${client.business_name}`);
        }

        logger.info(`⏰ Payment expired for invoice ${invoice.invoice_number}`);
      }
      // FAILED status
      else if (status === "FAILED") {
        await t.commit();
        logger.info(`❌ Payment failed for invoice ${invoice.invoice_number}`);
      } else {
        await t.commit();
      }

      return invoice;
    } catch (error: any) {
      await t.rollback();
      logger.error("Failed to process payment callback", {
        error: error.message,
      });
      throw error;
    }
  }
}
