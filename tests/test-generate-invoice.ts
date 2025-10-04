import { BillingService } from "../src/services/billingService";
import db from "../models";

(async () => {
  console.log("💰 Generating invoice for client 14...\n");

  try {
    const billingService = new BillingService();
    const result = await billingService.generateMonthlyInvoice(14);

    console.log("\n✅ Invoice generated successfully!");
    console.log("Invoice Number:", result.invoice.invoice_number);
    console.log("Amount:", result.invoice.total_amount);
    console.log("Checkout URL:", result.invoice.checkout_url);

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
})();
