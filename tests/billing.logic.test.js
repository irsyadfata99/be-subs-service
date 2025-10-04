const db = require("../models"); // Import models
const bcrypt = require("bcrypt");

const { Client, PlatformInvoice, EndUser } = db;

// Import services
const { BillingService } = require("../src/services/billingService");
const { CronService } = require("../src/services/cronService");

const billingService = new BillingService();
const cronService = new CronService();

describe("Billing Logic", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  test("Monthly invoice generation", async () => {
    const client = await Client.create({
      business_name: "Test Client",
      email: "test@billing.com",
      password: await bcrypt.hash("test123", 10),
      status: "active",
      role: "client",
      billing_date: new Date().getDate(),
      total_users: 5,
      price_per_user: 3000,
    });

    const invoice = await billingService.generateMonthlyInvoice(client.id);

    expect(invoice.total_amount).toBe(15000);
    expect(invoice.status).toBe("pending");
  });

  test("Trial expiry flow", async () => {
    const client = await Client.create({
      business_name: "Trial Client",
      email: "trial@test.com",
      password: await bcrypt.hash("test123", 10),
      status: "trial",
      role: "client",
      trial_ends_at: new Date(Date.now() - 86400000), // Yesterday
    });

    await cronService.checkTrialExpiry();

    await client.reload();
    expect(client.status).toBe("suspended");

    const invoice = await PlatformInvoice.findOne({
      where: { client_id: client.id },
    });
    expect(invoice).not.toBeNull();
  });

  test("Overdue suspension flow", async () => {
    const client = await Client.create({
      business_name: "Overdue Test",
      email: "overdue@test.com",
      password: await bcrypt.hash("test123", 10),
      status: "active",
      role: "client",
    });

    const invoice = await PlatformInvoice.create({
      client_id: client.id,
      invoice_number: "TEST-001",
      period_month: 9,
      period_year: 2025,
      due_date: new Date(Date.now() - 8 * 86400000), // 8 days ago
      total_amount: 10000,
      status: "pending",
    });

    await cronService.checkOverdueInvoices();

    await client.reload();
    expect(client.status).toBe("suspended");
  });
});
