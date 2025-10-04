import axios from "axios";
import logger from "../utils/logger";
import { formatDate } from "../utils/helpers";

interface PaymentReminderData {
  name: string;
  businessName: string;
  contactWhatsApp?: string;
  packageName: string;
  packagePrice: number;
  dueDate: Date;
  type: "before_3days" | "before_1day" | "overdue";
  phone: string;
}

/**
 * ✅ TWILIO WhatsApp Service
 * Menggunakan Twilio API untuk mengirim WhatsApp messages
 */
export class WhatsAppService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private apiUrl: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = process.env.TWILIO_AUTH_TOKEN || "";
    this.fromNumber =
      process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
    this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

    if (!this.accountSid || !this.authToken) {
      logger.warn("Twilio API credentials not configured");
    }
  }

  /**
   * Send WhatsApp message using Twilio API
   */
  async sendMessage(to: string, message: string) {
    try {
      // Skip if in test mode
      if (process.env.SKIP_EXTERNAL_API === "true") {
        logger.info("MOCK: WhatsApp message would be sent via Twilio", {
          to,
          preview: message.substring(0, 100),
        });
        return {
          success: true,
          messageId: "MOCK-TWILIO-" + Date.now(),
          status: "sent",
        };
      }

      // Format phone number for Twilio: whatsapp:+62xxx
      let formattedTo = to.replace(/\D/g, "");

      // Ensure starts with 62 (Indonesia)
      if (formattedTo.startsWith("0")) {
        formattedTo = "62" + formattedTo.substring(1);
      } else if (!formattedTo.startsWith("62")) {
        formattedTo = "62" + formattedTo;
      }

      // Add whatsapp: prefix for Twilio
      formattedTo = `whatsapp:+${formattedTo}`;

      // Prepare form data for Twilio
      const params = new URLSearchParams();
      params.append("To", formattedTo);
      params.append("From", this.fromNumber);
      params.append("Body", message);

      // Send via Twilio API
      const response = await axios.post(this.apiUrl, params, {
        auth: {
          username: this.accountSid,
          password: this.authToken,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000,
      });

      logger.info(`WhatsApp message sent via Twilio`, {
        to: formattedTo,
        sid: response.data.sid,
        status: response.data.status,
      });

      return {
        success: true,
        messageId: response.data.sid,
        status: response.data.status,
        twilioResponse: {
          sid: response.data.sid,
          status: response.data.status,
          price: response.data.price,
          priceUnit: response.data.price_unit,
        },
      };
    } catch (error: any) {
      logger.error(`Failed to send WhatsApp message via Twilio`, {
        to,
        error: error.response?.data || error.message,
        errorCode: error.response?.data?.code,
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        errorCode: error.response?.data?.code,
      };
    }
  }

  /**
   * Send trial warning with invoice details
   */
  async sendTrialWarningWithInvoice(
    phone: string,
    businessName: string,
    daysLeft: number,
    invoiceNumber: string,
    amount: number,
    dueDate: Date,
    checkoutUrl: string,
    billingDate: number
  ) {
    const formattedPrice = `Rp ${amount.toLocaleString("id-ID")}`;
    const formattedDate = formatDate(dueDate);
    const urgencyLevel =
      daysLeft <= 1
        ? "🚨 SEGERA"
        : daysLeft <= 3
        ? "⚠️ PENTING"
        : "📢 PENGINGAT";

    const message = `${urgencyLevel} - ${businessName}

Trial Anda akan berakhir dalam *${daysLeft} hari*.

📄 *Invoice Pembayaran*
No. Invoice: ${invoiceNumber}
💰 Total: ${formattedPrice}
📅 Jatuh Tempo: ${formattedDate}
📆 Billing Rutin: Setiap tanggal ${billingDate}

${
  checkoutUrl ? `Link pembayaran:\n${checkoutUrl}\n\n` : ""
}⚠️ *Aksi Diperlukan:*
Segera lakukan pembayaran sebelum ${formattedDate} untuk menghindari penonaktifan layanan.

❌ Jika terlambat, akun akan disuspend otomatis.
✅ Data Anda tetap aman selama 1 tahun.

Terima kasih! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send invoice and billing reminder
   */
  async sendInvoiceAndBillingReminder(
    phone: string,
    businessName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: Date,
    daysUntilDue: number,
    checkoutUrl: string,
    billingDate: number
  ) {
    const formattedPrice = `Rp ${amount.toLocaleString("id-ID")}`;
    const formattedDate = formatDate(dueDate);

    const message = `⚠️ *Reminder Pembayaran* - ${businessName}

Invoice Anda akan jatuh tempo dalam *${daysUntilDue} hari*.

📄 No. Invoice: ${invoiceNumber}
💰 Total: ${formattedPrice}
📅 Jatuh Tempo: ${formattedDate}
📆 Tanggal Billing Rutin: Setiap tanggal ${billingDate}

${
  checkoutUrl ? `Link pembayaran:\n${checkoutUrl}\n\n` : ""
}Segera lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari penonaktifan layanan.

⚠️ Jika terlambat, akun akan disuspend otomatis.
✅ Data Anda akan tetap aman selama 1 tahun.

Terima kasih! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send payment reminder to end users
   */
  async sendPaymentReminder(data: PaymentReminderData) {
    const message = this.generateReminderMessage(data);
    return await this.sendMessage(data.phone, message);
  }

  /**
   * Generate reminder message based on type
   */
  generateReminderMessage(data: PaymentReminderData): string {
    const {
      name,
      businessName,
      packageName,
      packagePrice,
      dueDate,
      type,
      contactWhatsApp,
    } = data;
    const formattedPrice = `Rp ${packagePrice.toLocaleString("id-ID")}`;
    const formattedDate = formatDate(dueDate);

    let message = "";

    if (type === "before_3days") {
      message = `🔔 *Pengingat Pembayaran* - ${businessName}

Halo ${name},

Ini adalah pengingat bahwa paket *${packageName}* Anda akan jatuh tempo dalam *3 hari*.

📦 Paket: ${packageName}
💰 Biaya: ${formattedPrice}
📅 Jatuh Tempo: ${formattedDate}

Mohon segera lakukan pembayaran sebelum tanggal jatuh tempo.`;
    } else if (type === "before_1day") {
      message = `⚠️ *Pengingat Pembayaran Penting* - ${businessName}

Halo ${name},

Paket *${packageName}* Anda akan jatuh tempo *BESOK*.

📦 Paket: ${packageName}
💰 Biaya: ${formattedPrice}
📅 Jatuh Tempo: ${formattedDate}

⏰ Segera lakukan pembayaran untuk menghindari penonaktifan layanan.`;
    } else if (type === "overdue") {
      message = `🚨 *TAGIHAN TERLAMBAT* - ${businessName}

Halo ${name},

Pembayaran paket *${packageName}* Anda telah melewati jatuh tempo.

📦 Paket: ${packageName}
💰 Biaya: ${formattedPrice}
📅 Jatuh Tempo: ${formattedDate}

⚠️ Layanan Anda mungkin akan dinonaktifkan jika pembayaran tidak segera dilakukan.
Mohon segera hubungi kami untuk menyelesaikan pembayaran.`;
    }

    if (contactWhatsApp) {
      message += `\n\nHubungi kami: ${contactWhatsApp}`;
    }

    message += `\n\n⚠️ Ini adalah pesan otomatis.\n❌ JANGAN BALAS pesan ini.`;
    return message;
  }

  /**
   * Send trial warning without invoice
   */
  async sendTrialWarning(
    phone: string,
    businessName: string,
    daysLeft: number,
    monthlyBill: number
  ) {
    const formattedPrice = `Rp ${monthlyBill.toLocaleString("id-ID")}`;

    const message = `⚠️ *Peringatan Trial* - ${businessName}

Trial Anda akan berakhir dalam *${daysLeft} hari*.

💰 Biaya bulanan: ${formattedPrice}

Silakan lakukan pembayaran untuk melanjutkan layanan.
Login ke dashboard untuk melihat invoice.

Terima kasih! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send invoice created notification
   */
  async sendInvoiceCreated(
    phone: string,
    businessName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: Date,
    checkoutUrl: string
  ) {
    const formattedPrice = `Rp ${amount.toLocaleString("id-ID")}`;
    const formattedDate = formatDate(dueDate);

    const message = `📄 *Invoice Baru* - ${businessName}

Invoice bulanan Anda telah dibuat.

📄 No. Invoice: ${invoiceNumber}
💰 Total: ${formattedPrice}
📅 Jatuh Tempo: ${formattedDate}

Link pembayaran:
${checkoutUrl}

Silakan lakukan pembayaran sebelum tanggal jatuh tempo.

Terima kasih! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send payment confirmation
   */
  async sendPaymentConfirmation(
    phone: string,
    businessName: string,
    invoiceNumber: string,
    amount: number,
    paidAt: Date
  ) {
    const formattedPrice = `Rp ${amount.toLocaleString("id-ID")}`;
    const formattedDate = formatDate(paidAt);

    const message = `✅ *Pembayaran Diterima* - ${businessName}

Terima kasih! Pembayaran Anda telah kami terima.

📄 No. Invoice: ${invoiceNumber}
💰 Jumlah: ${formattedPrice}
📅 Tanggal Bayar: ${formattedDate}

Status akun Anda telah diaktifkan kembali.

Terima kasih atas kepercayaan Anda! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send payment expired notification
   */
  async sendPaymentExpired(
    phone: string,
    businessName: string,
    invoiceNumber: string
  ) {
    const message = `⏰ *Pembayaran Kedaluwarsa* - ${businessName}

Link pembayaran untuk invoice ${invoiceNumber} telah kedaluwarsa.

Silakan login ke dashboard untuk membuat link pembayaran baru:
${process.env.FRONTEND_URL}/billing

Terima kasih! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send account suspended notification
   */
  async sendAccountSuspended(
    phone: string,
    businessName: string,
    reason: string
  ) {
    const message = `🚨 *Akun Disuspend* - ${businessName}

Akun Anda telah disuspend karena ${reason}.

⚠️ Semua fitur telah dinonaktifkan.
💾 Data Anda tetap AMAN selama 1 tahun.
🗑️ Setelah 1 tahun, data akan dihapus otomatis.

Silakan login dan bayar invoice untuk mengaktifkan kembali layanan.

📱 Login: ${process.env.FRONTEND_URL}/billing

Terima kasih! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send trial expired notification (softer tone)
   */
  async sendTrialExpired(phone: string, businessName: string) {
    const message = `📢 *Masa Trial Berakhir* - ${businessName}

Masa trial Anda telah berakhir.

Untuk melanjutkan menggunakan layanan kami, silakan lakukan pembayaran melalui invoice yang sudah kami kirim.

💾 Data Anda tetap AMAN dan tidak akan hilang.
✅ Begitu pembayaran diterima, akun akan aktif kembali.

📱 Login untuk bayar: ${process.env.FRONTEND_URL}/billing

Terima kasih telah mencoba layanan kami! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send account activated notification
   */
  async sendAccountActivated(phone: string, businessName: string) {
    const message = `✅ *Akun Diaktifkan* - ${businessName}

Selamat! Akun Anda telah aktif.

Anda sekarang dapat menggunakan semua fitur layanan kami.

Terima kasih! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }

  /**
   * Send platform invoice notification
   */
  async sendPlatformInvoice(
    phone: string,
    businessName: string,
    invoiceNumber: string,
    amount: number,
    checkoutUrl: string
  ) {
    const formattedPrice = `Rp ${amount.toLocaleString("id-ID")}`;

    const message = `📄 *Invoice Platform* - ${businessName}

Invoice pembayaran platform Anda:

📄 No. Invoice: ${invoiceNumber}
💰 Total: ${formattedPrice}

Link pembayaran:
${checkoutUrl}

Terima kasih! 🙏

⚠️ Ini adalah pesan otomatis.
❌ JANGAN BALAS pesan ini.`;

    return await this.sendMessage(phone, message);
  }
}
