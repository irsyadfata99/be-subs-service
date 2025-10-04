import dotenv from "dotenv";
import { WhatsAppService } from "../services/whatsappService.ts.backup";

dotenv.config();

async function testFonnte() {
  console.log("🧪 Testing Fonnte WhatsApp API...\n");

  // Validation
  if (!process.env.WHATSAPP_TOKEN) {
    console.error("❌ Error: WHATSAPP_TOKEN not found in .env");
    console.log("Please add your Fonnte token to .env file");
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
  console.log("🔑 Token:", process.env.WHATSAPP_TOKEN.substring(0, 10) + "...");
  console.log("");

  try {
    // Test 1: Simple Message
    console.log("Test 1: Sending simple message...");
    const testMessage = `
🧪 Test dari Payment Reminder Platform

Halo! Ini adalah test message untuk memastikan Fonnte WhatsApp API berfungsi dengan baik.

Waktu: ${new Date().toLocaleString("id-ID")}

✅ Jika Anda menerima pesan ini, berarti konfigurasi Fonnte sudah benar!
    `.trim();

    const result1 = await whatsappService.sendMessage(testPhone, testMessage);
    console.log("✅ Test 1 Success!");
    console.log("Response:", JSON.stringify(result1, null, 2));
    console.log("");

    // Wait 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: Payment Reminder Format
    console.log("Test 2: Sending payment reminder format...");
    const reminderData = {
      name: "John Doe (Test User)",
      businessName: "Gym Sehat (Test)",
      packageName: "Premium Package",
      packagePrice: 150000,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
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
    console.log("✅ Fonnte WhatsApp integration is working!");
    console.log("\n📱 Check your WhatsApp to see the messages");
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown }; message?: string };
    console.error("❌ Test failed!");
    console.error("Error:", err.message);
    if (err.response) {
      console.error("Response:", JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

testFonnte();
