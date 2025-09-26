import axios from "axios";
import { createTripaySignature, generateMerchantRef } from "../utils/helpers";

interface TripayPaymentData {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderItems: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  returnUrl?: string;
  expiredTime?: number;
}

interface TripayResponse {
  reference: string;
  merchant_ref: string;
  payment_method: string;
  checkout_url: string;
  pay_code?: string;
  expired_time: number;
  total_fee: number;
  amount_received: number;
}

export class TripayService {
  private apiUrl: string;
  private apiKey: string;
  private merchantCode: string;
  private mode: string;

  constructor() {
    this.apiUrl = process.env.TRIPAY_API_URL || "";
    this.apiKey = process.env.TRIPAY_API_KEY || "";
    this.merchantCode = process.env.TRIPAY_MERCHANT_CODE || "";
    this.mode = process.env.TRIPAY_MODE || "sandbox";
  }

  async createPayment(data: TripayPaymentData): Promise<TripayResponse> {
    if (process.env.SKIP_EXTERNAL_API === "true") {
      console.log(
        "💳 [MOCK] Tripay payment would be created for:",
        data.customerName
      );
      console.log("💰 Amount:", data.amount);

      const mockResponse: TripayResponse = {
        reference: "MOCK-REF-" + Date.now(),
        merchant_ref: generateMerchantRef(),
        payment_method: "BRIVA",
        checkout_url: "https://tripay.co.id/mock-checkout",
        pay_code: "123456789",
        expired_time: Math.floor(Date.now() / 1000) + 24 * 3600,
        total_fee: 4000,
        amount_received: data.amount,
      };

      return mockResponse;
    }

    try {
      const merchantRef = generateMerchantRef();
      const signature = createTripaySignature(
        this.merchantCode,
        merchantRef,
        data.amount
      );

      const payload = {
        method: "BRIVA",
        merchant_ref: merchantRef,
        amount: data.amount,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: data.customerPhone,
        order_items: data.orderItems,
        return_url: data.returnUrl || process.env.FRONTEND_URL,
        expired_time: data.expiredTime || 24 * 3600,
        signature: signature,
      };

      const response = await axios.post(
        `${this.apiUrl}/transaction/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to create payment");
      }
    } catch (error: any) {
      console.error(
        "Tripay create payment error:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to create Tripay payment"
      );
    }
  }

  async getPaymentDetail(reference: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/transaction/detail?reference=${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Failed to get payment detail"
        );
      }
    } catch (error: any) {
      console.error(
        "Tripay get detail error:",
        error.response?.data || error.message
      );
      throw new Error(
        error.response?.data?.message || "Failed to get payment detail"
      );
    }
  }

  async getPaymentChannels(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/merchant/payment-channel`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.message || "Failed to get payment channels"
        );
      }
    } catch (error: any) {
      console.error(
        "Tripay get channels error:",
        error.response?.data || error.message
      );
      return [];
    }
  }
}
