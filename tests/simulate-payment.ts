const db = require("./models");

(async () => {
  const { PlatformInvoice, Client } = db;

  console.log("💳 Simulating payment for testweek2@test.com...\n");

  try {
    const client = await Client.findOne({
      where: { email: "testweek2@test.com" },
    });

    if (!client) {
      console.log("❌ Client not found");
      process.exit(1);
    }

    const invoice = await PlatformInvoice.findOne({
      where: {
        client_id: client.id,
        status: "pending",
      },
      order: [["created_at", "DESC"]],
    });

    if (!invoice) {
      console.log("❌ No pending invoice found");
      process.exit(1);
    }

    console.log("Found invoice:", invoice.invoice_number);
    console.log("Amount:", invoice.total_amount);

    await invoice.update({
      status: "paid",
      paid_at: new Date(),
      amount_received: invoice.total_amount,
    });

    await client.update({ status: "active" });

    console.log("\n✅ Payment processed!");
    console.log("✅ Client status: active");
    console.log("\nNext: Logout and login again");
    console.log("Expected: No modal, dashboard accessible");

    process.exit(0);
  } catch (error) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
})();
