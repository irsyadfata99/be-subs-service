import { CronService } from "../src/services/cronService";

(async () => {
  console.log("🔍 Testing Trial Expiry Check...\n");

  const cronService = new CronService();

  try {
    await cronService["checkTrialExpiry"]();
    console.log("\n✅ Trial expiry check completed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
})();
