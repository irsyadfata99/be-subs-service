import { execSync } from "child_process";

const tests = [
  "test-anniversary-billing.ts",
  "test-prebilling-notifications.ts",
  "test-invoice-due-reminders.ts",
  "test-grace-period.ts",
  "test-90day-trial.ts",
];

console.log("🚀 Running all Week 2 tests...\n");

for (const test of tests) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running: ${test}`);
  console.log("=".repeat(60));

  try {
    execSync(`npx ts-node ${test}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`\n❌ ${test} failed\n`);
  }
}

console.log("\n✅ All Week 2 tests completed!\n");
