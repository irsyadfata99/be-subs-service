import dotenv from "dotenv";
dotenv.config();

import { WhatsAppService } from "../src/services/whatsappService";

(async () => {
  console.log("🧪 Testing Twilio WhatsApp API...\n");

  // Validation
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.error("❌ Error: TWILIO_ACCOUNT_SID not found in .env");
    process.exit(1);
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.error("❌ Error: TWILIO_AUTH_TOKEN not found in .env");
    process.exit(1);
  }

  if (!process.env.TEST_WHATSAPP_NUMBER) {
    console.error("❌ Error: TEST_WHATSAPP_NUMBER not found in .env");
    console.log("Please add your WhatsApp number to .env file");
    process.exit(1);
  }

  const whatsappService = new WhatsAppService();
  const testPhone = process.env.TEST_WHATSAPP_NUMBER;

  console.log("📱 Target Phone:", testPhone);
  console.log(
    "🔑 Account SID:",
    process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + "..."
  );
  console.log("📞 From Number:", process.env.TWILIO_WHATSAPP_FROM);
  console.log("");

  try {
    // Test 1: Simple Message
    console.log("Test 1: Sending simple message...");
    const testMessage = `🧪 Test dari Payment Reminder Platform (Twilio)

Halo ayangg ini mas kirim pake web apps, keren ya :)).

Waktu: ${new Date().toLocaleString("id-ID")}

Akhirnya beres dan berjalan normal :" tinggal deployment sama tripay sandbox`;

    const result1 = await whatsappService.sendMessage(testPhone, testMessage);
    console.log("✅ Test 1 Success!");
    console.log("Response:", JSON.stringify(result1, null, 2));
    console.log("");

    // Wait 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: Payment Reminder Format
    console.log("Test 2: Sending payment reminder format...");
    const reminderData = {
      name: "Eva herlina (Test User)",
      businessName: "Worksheet",
      packageName: "Premium Package",
      packagePrice: 150000,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      type: "before_3days" as const,
      phone: testPhone,
    };

    const result2 = await whatsappService.sendPaymentReminder(reminderData);
    console.log("✅ Test 2 Success!");
    console.log("Response:", JSON.stringify(result2, null, 2));
    console.log("");

    // Wait 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 3: Platform Invoice Format
    console.log("Test 3: Sending platform invoice format...");
    const result3 = await whatsappService.sendPlatformInvoice(
      testPhone,
      "Test Business",
      "PINV-202501-1234",
      90000,
      "https://tripay.co.id/checkout/T12345TEST"
    );
    console.log("✅ Test 3 Success!");
    console.log("Response:", JSON.stringify(result3, null, 2));
    console.log("");

    console.log("🎉 All tests completed successfully!");
    console.log("✅ Twilio WhatsApp integration is working!");
    console.log("\n📱 Check your WhatsApp to see the messages");

    // Cost information
    console.log("\n💰 Cost Information:");
    console.log("   - 3 messages sent");
    console.log("   - Estimated cost: ~$0.015 (if production)");
    console.log("   - Sandbox: FREE");
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error("❌ Test failed!");
    console.error("Error:", err.message);
    if (err.response) {
      console.error("Response:", JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }

  process.exit(0);
})();
