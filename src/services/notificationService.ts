import logger from "../utils/logger";
import { WhatsAppService } from "./whatsappService.ts.backup";

export class NotificationService {
  private static whatsapp = new WhatsAppService();
  private static adminNumbers =
    process.env.ADMIN_WHATSAPP_NUMBERS?.split(",") || [];

  /**
   * Notify admins of critical errors
   */
  static async notifyCriticalError(error: Error, context?: any) {
    if (this.adminNumbers.length === 0) {
      logger.warn("No admin numbers configured for notifications");
      return;
    }

    const message = `🚨 *CRITICAL ERROR*
    
*Environment:* ${process.env.NODE_ENV}
*Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
*Error:* ${error.message}

*Context:*
${JSON.stringify(context, null, 2).substring(0, 500)}

*Stack:*
${error.stack?.substring(0, 500) || "No stack trace"}`;

    for (const adminNumber of this.adminNumbers) {
      try {
        await this.whatsapp.sendMessage(adminNumber, message);
        logger.info(`Critical error notification sent to ${adminNumber}`);
      } catch (err: any) {
        logger.error("Failed to send error notification", {
          admin: adminNumber,
          error: err.message,
        });
      }
    }
  }

  /**
   * Notify admins when a service goes down
   */
  static async notifyServiceDown(serviceName: string, details?: string) {
    if (this.adminNumbers.length === 0) return;

    const message = `⚠️ *SERVICE DOWN*

*Service:* ${serviceName}
*Environment:* ${process.env.NODE_ENV}
*Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}

${details ? `*Details:* ${details}\n\n` : ""}Please investigate immediately!`;

    for (const adminNumber of this.adminNumbers) {
      try {
        await this.whatsapp.sendMessage(adminNumber, message);
      } catch (err: any) {
        logger.error("Failed to send service down notification", {
          error: err.message,
        });
      }
    }
  }

  /**
   * Notify admins of high memory usage
   */
  static async notifyHighMemory(memoryUsageMB: number) {
    if (this.adminNumbers.length === 0) return;

    const message = `⚠️ *HIGH MEMORY USAGE*

*Memory Used:* ${memoryUsageMB}MB
*Threshold:* 400MB
*Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}

Server may need restart soon.`;

    for (const adminNumber of this.adminNumbers) {
      try {
        await this.whatsapp.sendMessage(adminNumber, message);
      } catch (err: any) {
        logger.error("Failed to send memory notification", {
          error: err.message,
        });
      }
    }
  }

  /**
   * Notify admins when database connection fails
   */
  static async notifyDatabaseDown() {
    if (this.adminNumbers.length === 0) return;

    const message = `🚨 *DATABASE CONNECTION FAILED*

*Environment:* ${process.env.NODE_ENV}
*Time:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}

Database is unreachable. System may be down!`;

    for (const adminNumber of this.adminNumbers) {
      try {
        await this.whatsapp.sendMessage(adminNumber, message);
      } catch (err: any) {
        logger.error("Failed to send database notification", {
          error: err.message,
        });
      }
    }
  }
}
