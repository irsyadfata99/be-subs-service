import db from "../models";

const { Client } = db;

(async () => {
  console.log("🧪 Testing 90-Day Trial Period...\n");

  try {
    // Find most recent trial clients
    const trialClients = await Client.findAll({
      where: { status: "trial" },
      order: [["created_at", "DESC"]],
      limit: 5,
    });

    console.log(`Found ${trialClients.length} trial clients:\n`);

    for (const client of trialClients) {
      const created = new Date(client.created_at);
      const trialEnds = new Date(client.trial_ends_at);
      const trialDays = Math.floor((trialEnds.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`📋 ${client.business_name}`);
      console.log(`   Email: ${client.email}`);
      console.log(`   Registered: ${created.toISOString().split("T")[0]}`);
      console.log(`   Trial ends: ${trialEnds.toISOString().split("T")[0]}`);
      console.log(`   Trial period: ${trialDays} days`);
      console.log(`   Status: ${trialDays === 90 ? "✅ CORRECT" : "❌ WRONG"}\n`);
    }

    console.log("💡 To register new client and test:");
    console.log(`
curl -X POST http://localhost:5000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "business_name": "Test 90 Days",
    "business_type": "Gym",
    "email": "test90days@test.com",
    "password": "Test123!@#",
    "contact_whatsapp": "6281318465501"
  }'
    `);

    console.log("\nThen run this script again to verify 90-day period.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
