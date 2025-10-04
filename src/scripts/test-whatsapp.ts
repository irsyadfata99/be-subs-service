import dotenv from "dotenv";
dotenv.config();

import { WhatsAppService } from "../services/whatsappService.ts.backup";

(async () => {
  console.log("🧪 Testing WhatsApp Official API...\n");

  const wa = new WhatsAppService();

  // Ganti dengan nomor WhatsApp admin Anda
  const testNumber = "628123456789"; // Format: 628xxxxx

  const result = await wa.sendMessage(
    testNumber,
    "🎉 Test dari Payment Reminder Platform!\n\nWhatsApp Official API berhasil diintegrasikan!"
  );

  console.log("Result:", result);

  if (result.success) {
    console.log("\n✅ WhatsApp API working!");
  } else {
    console.log("\n❌ WhatsApp API failed:", result.error);
  }

  process.exit(0);
})();
