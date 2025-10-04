import dotenv from "dotenv";
dotenv.config();

import { BillingService } from "./src/services/billingService";

(async () => {
  console.log("Generating trial invoice for client_id 21...\n");

  const billing = new BillingService();

  try {
    const result = await billing.generateOrGetTrialInvoice(21);

    console.log("Invoice generated!");
    console.log("Invoice Number:", result.invoice.invoice_number);
    console.log("Amount:", result.invoice.total_amount);
    console.log("Due Date:", result.invoice.due_date);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    console.error("\nStack:", (error as Error).stack);
    process.exit(1);
  }
})();
