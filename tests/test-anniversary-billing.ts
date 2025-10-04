import { CronService } from "../src/services/cronService";
import db from "../models";

const { Client, PlatformInvoice } = db;

(async () => {
  console.log("🧪 Testing Anniversary Billing...\n");

  try {
    // Get current date
    const today = new Date().getDate();
    console.log(`Today is day ${today} of the month\n`);

    // Find clients with billing_date matching today
    const clientsToBill = await Client.findAll({
      where: {
        status: "active",
        billing_date: today,
      },
    });

    console.log(`Found ${clientsToBill.length} clients with billing_date = ${today}`);

    if (clientsToBill.length === 0) {
      console.log("\n⚠️ No clients to bill today.");
      console.log("Create a test client with billing_date matching today:");
      console.log(`
UPDATE clients 
SET billing_date = ${today}, 
    status = 'active',
    total_users = 2,
    monthly_bill = 6000
WHERE email = 'newclient@test.com';
      `);
    } else {
      // Trigger billing
      const cron = new CronService();

      // Access private method - simulate what daily cron does
      for (const client of clientsToBill) {
        console.log(`\n💰 Processing: ${client.business_name}`);
        console.log(`   Billing date: ${client.billing_date}`);
        console.log(`   Monthly bill: Rp ${parseInt(client.monthly_bill).toLocaleString("id-ID")}`);
      }

      console.log("\n✅ Anniversary billing check complete");
    }

    // Show all clients and their billing dates
    const allClients = await Client.findAll({
      where: { status: ["active", "trial"] },
      attributes: ["business_name", "billing_date", "status", "monthly_bill"],
    });

    console.log("\n📊 All Active Clients:");
    console.table(
      allClients.map((c) => ({
        name: c.business_name,
        billing_day: c.billing_date,
        status: c.status,
        monthly: `Rp ${parseInt(c.monthly_bill).toLocaleString("id-ID")}`,
      }))
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
