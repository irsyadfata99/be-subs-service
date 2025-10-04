import { BillingService } from "../src/services/billingService";

(async () => {
  console.log("💰 Testing Monthly Billing...\n");

  const billingService = new BillingService();

  try {
    const result = await billingService.generateAllMonthlyInvoices();

    console.log("\n✅ Monthly billing completed!");
    console.log("Total clients:", result.total_clients);
    console.log("Invoices created:", result.invoices_created);

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
})();
