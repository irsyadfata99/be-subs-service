import { CronService } from "../src/services/cronService";

(async () => {
  console.log("🔔 Testing Cron Service...\n");

  const cronService = new CronService();

  try {
    console.log("📤 Sending all reminders...");
    await cronService["sendAllReminders"]();
    console.log("\n✅ Cron executed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
})();
