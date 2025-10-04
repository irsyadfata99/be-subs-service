import { CronService } from "../src/services/cronService";
import { addDays } from "../src/utils/helpers";
import db from "../models";
import { Op } from "sequelize";

const { PlatformInvoice, Client } = db;

(async () => {
  console.log("🧪 Testing Invoice Due Date Reminders (H-7, H-3, H-1)...\n");

  try {
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

      console.log(`\n📅 H-${days} (Due date ${targetDate.toISOString().split("T")[0]})`);
      console.log(`   Found ${invoices.length} pending invoices`);

      if (invoices.length > 0) {
        for (const invoice of invoices) {
          const client = (invoice as any).client;
          console.log(`   ✓ ${invoice.invoice_number}`);
          console.log(`     Client: ${client.business_name}`);
          console.log(`     Amount: Rp ${parseInt(invoice.total_amount).toLocaleString("id-ID")}`);
          console.log(`     Due: ${invoice.due_date}`);
        }
      }
    }

    console.log("\n🚀 Running sendInvoiceDueReminders...\n");
    const cron = new CronService();
    await cron["sendInvoiceDueReminders"]();

    console.log("\n✅ Invoice due reminder test complete");

    console.log("\n💡 Tip: Create test invoice with due date 7 days from now:");
    console.log(`
INSERT INTO platform_invoices (client_id, invoice_number, period_month, period_year, total_users, price_per_user, total_amount, due_date, status, checkout_url, created_at, updated_at)
SELECT id, 'PINV-TEST-DUE', MONTH(CURDATE()), YEAR(CURDATE()), 2, 3000, 6000, DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'pending', 'https://tripay.co.id/mock', NOW(), NOW()
FROM clients WHERE email = 'newclient@test.com';
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
