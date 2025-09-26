import axios from "axios";
import { formatCurrency, formatDate } from "../utils/helpers";

interface WhatsAppMessage {
  phone: string;
  message: string;
}

interface ReminderData {
  name: string;
  businessName: string;
  packageName: string;
  packagePrice: number;
  dueDate: Date;
  type: "before_3days" | "before_1day" | "overdue";
  phone: string; // ← Tambahkan ini
}

export class WhatsAppService {
  private apiUrl: string;
  private token: string;

  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || "";
    this.token = process.env.WHATSAPP_TOKEN || "";
  }

  async sendMessage(phone: string, message: string): Promise<any> {
    // Mock untuk development
    if (process.env.SKIP_EXTERNAL_API === "true") {
      console.log("📱 [MOCK] WhatsApp would send to:", phone);
      console.log("📝 Message:", message);
      return {
        success: true,
        data: {
          status: "sent",
          message: "Mock: Message sent successfully",
        },
      };
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          target: phone,
          message: message,
          countryCode: "62",
        },
        {
          headers: {
            Authorization: this.token,
          },
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error(
        "WhatsApp send error:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to send WhatsApp message"
      );
    }
  }

  generateReminderMessage(data: ReminderData): string {
    const { name, businessName, packageName, packagePrice, dueDate, type } =
      data;
    const formattedPrice = formatCurrency(packagePrice);
    const formattedDate = formatDate(dueDate);

    const templates = {
      before_3days: `Halo ${name},

Reminder pembayaran ${businessName}:

📦 Paket: ${packageName}
💰 Jumlah: ${formattedPrice}
📅 Jatuh tempo: ${formattedDate} (3 hari lagi)

Mohon segera lakukan pembayaran.

Terima kasih! 🙏`,

      before_1day: `Halo ${name},

⚠️ Reminder pembayaran ${businessName}:

📦 Paket: ${packageName}
💰 Jumlah: ${formattedPrice}
📅 Jatuh tempo: ${formattedDate} (BESOK)

Mohon segera lakukan pembayaran.

Terima kasih! 🙏`,

      overdue: `Halo ${name},

❗ Pemberitahuan pembayaran ${businessName}:

📦 Paket: ${packageName}
💰 Jumlah: ${formattedPrice}
📅 Jatuh tempo: ${formattedDate} (SUDAH LEWAT)

Pembayaran Anda sudah melewati jatuh tempo. Mohon segera lakukan pembayaran untuk menghindari penalti.

Terima kasih! 🙏`,
    };

    return templates[type];
  }

  async sendPaymentReminder(data: ReminderData): Promise<any> {
    const message = this.generateReminderMessage(data);
    return await this.sendMessage(data.phone, message); // ← Gunakan data.phone
  }

  async sendPlatformInvoice(
    phone: string,
    businessName: string,
    invoiceNumber: string,
    amount: number,
    checkoutUrl: string
  ): Promise<any> {
    const message = `Halo ${businessName},

Invoice platform pembayaran Anda untuk bulan ini:

📄 Invoice: ${invoiceNumber}
💰 Total: ${formatCurrency(amount)}

Link pembayaran:
${checkoutUrl}

Terima kasih telah menggunakan layanan kami! 🙏`;

    return await this.sendMessage(phone, message);
  }
}
