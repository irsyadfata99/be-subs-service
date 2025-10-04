import { CronService } from "../src/services/cronService";
import { addDays } from "../src/utils/helpers";
import db from "../models";
import { Op } from "sequelize";

const { PlatformInvoice, Client } = db;

(async () => {
  console.log("🧪 Testing Grace Period & Suspension...\n");

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const gracePeriodEnd = addDays(today, -7);

    // Check invoices in grace period (1-7 days overdue)
    const gracePeriodInvoices = await PlatformInvoice.findAll({
      where: {
        due_date: {
          [Op.lt]: today,
          [Op.gte]: gracePeriodEnd,
        },
        status: "pending",
      },
      include: [{ model: Client, as: "client" }],
    });

    console.log("📋 Invoices in Grace Period (1-7 days overdue):");
    console.log(`   Found ${gracePeriodInvoices.length} invoices\n`);

    for (const invoice of gracePeriodInvoices) {
      const client = (invoice as any).client;
      const daysOverdue = Math.floor((today.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));

      console.log(`   ⚠️ ${invoice.invoice_number}`);
      console.log(`      Client: ${client.business_name} (${client.status})`);
      console.log(`      Days overdue: ${daysOverdue}`);
      console.log(`      Amount: Rp ${parseInt(invoice.total_amount).toLocaleString("id-ID")}`);
      console.log(`      Will suspend in: ${7 - daysOverdue} days\n`);
    }

    // Check invoices past grace period (>7 days overdue)
    const severeOverdue = await PlatformInvoice.findAll({
      where: {
        due_date: { [Op.lt]: gracePeriodEnd },
        status: { [Op.in]: ["pending", "overdue"] },
      },
      include: [{ model: Client, as: "client" }],
    });

    console.log("🚨 Invoices Past Grace Period (>7 days overdue):");
    console.log(`   Found ${severeOverdue.length} invoices\n`);

    for (const invoice of severeOverdue) {
      const client = (invoice as any).client;
      const daysOverdue = Math.floor((today.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));

      console.log(`   🚨 ${invoice.invoice_number}`);
      console.log(`      Client: ${client.business_name} (${client.status})`);
      console.log(`      Days overdue: ${daysOverdue}`);
      console.log(`      Status: SHOULD BE SUSPENDED\n`);
    }

    console.log("🚀 Running checkOverdueInvoices...\n");
    const cron = new CronService();
    await cron["checkOverdueInvoices"]();

    console.log("\n✅ Grace period test complete");

    console.log("\n💡 Tip: Create test overdue invoice (3 days):");
    console.log(`
UPDATE platform_invoices 
SET due_date = DATE_SUB(CURDATE(), INTERVAL 3 DAY),
    status = 'pending'
WHERE client_id = (SELECT id FROM clients WHERE email = 'newclient@test.com');
    `);

    console.log("\n💡 For suspension test (8 days):");
    console.log(`
UPDATE platform_invoices 
SET due_date = DATE_SUB(CURDATE(), INTERVAL 8 DAY)
WHERE client_id = (SELECT id FROM clients WHERE email = 'newclient@test.com');
    `);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
