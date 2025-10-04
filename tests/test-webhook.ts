import { handleTripayCallback } from "../src/controllers/webhookController";
import crypto from "crypto";

(async () => {
  const payload = {
    reference: "T12345678",
    merchant_ref: "PINV-202509-9626",
    status: "PAID",
    amount: 3000,
    paid_at: Math.floor(Date.now() / 1000),
  };

  const signature = crypto.createHmac("sha256", process.env.TRIPAY_PRIVATE_KEY!).update(JSON.stringify(payload)).digest("hex");

  const mockReq: any = {
    headers: { "x-callback-signature": signature },
    body: payload,
  };

  const mockRes: any = {
    status: (code: number) => ({
      json: (data: any) => console.log("Response:", code, data),
    }),
    json: (data: any) => console.log("Response:", data),
  };

  await handleTripayCallback(mockReq, mockRes);
  process.exit(0);
})();
