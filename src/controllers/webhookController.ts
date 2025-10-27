import { Request, Response } from "express";
import crypto from "crypto";
import { PlatformInvoice, Client } from "../../models";
import logger from "../utils/logger";
import { WhatsAppService } from "../services/whatsappService";

const whatsappService = new WhatsAppService();

export const handleTripayCallback = async (req: Request, res: Response) => {
  try {
    const callbackSignature = req.headers["x-callback-signature"] as string;
    const payload = req.body;

    // Verify signature
    const privateKey = process.env.TRIPAY_PRIVATE_KEY || "";
    const signature = crypto.createHmac("sha256", privateKey).update(JSON.stringify(payload)).digest("hex");

    if (signature !== callbackSignature) {
      logger.warn("Invalid Tripay callback signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const { reference, status, merchant_ref } = payload;

    logger.info(`Tripay callback received: ${reference} - Status: ${status}`);

    // Find invoice by merchant_ref or reference
    const invoice = await PlatformInvoice.findOne({
      where: {
        tripay_reference: reference,
      },
      include: [{ model: Client, as: "client" }],
    });

    if (!invoice) {
      logger.warn(`Invoice not found for Tripay reference: ${reference}`);
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Update invoice based on payment status
    if (status === "PAID") {
      await invoice.update({ status: "paid" });

      const client = (invoice as any).client;

      // Activate client if suspended
      if (client.status === "suspended" || client.status === "trial") {
        const newBillingDate = new Date();
        newBillingDate.setMonth(newBillingDate.getMonth() + 1);

        await client.update({
          status: "active",
          billing_date: newBillingDate,
        });

        logger.info(`✅ Client ${client.business_name} activated`);
      }

      // Send WhatsApp confirmation
      if (client.contact_whatsapp) {
        await whatsappService.sendPaymentConfirmation(client.contact_whatsapp, client.business_name, invoice.invoice_number, invoice.total_amount, new Date());
      }

      logger.info(`✅ Payment confirmed for invoice ${invoice.invoice_number}`);
    } else if (status === "EXPIRED") {
      logger.info(`⏰ Payment expired for invoice ${invoice.invoice_number}`);
      // Payment expired, invoice stays pending
    } else if (status === "FAILED") {
      logger.info(`❌ Payment failed for invoice ${invoice.invoice_number}`);
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error("Error handling Tripay callback:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
