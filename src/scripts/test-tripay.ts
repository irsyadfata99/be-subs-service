import dotenv from "dotenv";
dotenv.config();

import { TripayService } from "../services/tripayService";

(async () => {
  console.log("🧪 Testing Tripay Production API...\n");

  const tripay = new TripayService();

  try {
    // Test: Get payment channels
    const channels = await tripay.getPaymentChannels();

    console.log("✅ Available payment channels:");
    console.log(channels.filter((c) => ["BRIVA", "QRIS"].includes(c.code)));

    console.log("\n✅ Tripay API working!");
  } catch (error: any) {
    console.log("❌ Tripay API failed:", error.message);
  }

  process.exit(0);
})();
