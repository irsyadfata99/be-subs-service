import { CronService } from "../src/services/cronService";
import { addDays } from "../src/utils/helpers";
import db from "../models";

const { Client } = db;

(async () => {
  console.log("🧪 Testing Pre-Billing Notifications (H-7, H-3, H-1)...\n");

  try {
    const today = new Date();
    const daysToCheck = [7, 3, 1];

    for (const days of daysToCheck) {
      const targetDate = addDays(today, days).getDate();

      const clients = await Client.findAll({
        where: {
          status: "active",
          billing_date: targetDate,
        },
      });

      console.log(`\n📅 H-${days} (Billing date ${targetDate})`);
      console.log(`   Found ${clients.length} clients`);

      if (clients.length > 0) {
        for (const client of clients) {
          console.log(`   ✓ ${client.business_name}`);
          console.log(`     Monthly bill: Rp ${parseInt(client.monthly_bill).toLocaleString("id-ID")}`);
          console.log(`     WhatsApp: ${client.contact_whatsapp || "Not set"}`);
        }
      }
    }

    console.log("\n🚀 Running sendUpcomingBillingNotifications...\n");
    const cron = new CronService();
    await cron["sendUpcomingBillingNotifications"]();

    console.log("\n✅ Pre-billing notification test complete");

    console.log("\n💡 Tip: To test specific days, update a client:");
    console.log(`
UPDATE clients 
SET billing_date = DAY(DATE_ADD(CURDATE(), INTERVAL 3 DAY))
WHERE email = 'your-client@test.com';
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
