import crypto from "crypto";

export const generateInvoiceNumber = (prefix: string = "INV"): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${year}${month}-${random}`;
};

export const generateMerchantRef = (): string => {
  return `MR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createTripaySignature = (merchantCode: string, merchantRef: string, amount: number): string => {
  const privateKey = process.env.TRIPAY_PRIVATE_KEY || "";
  const data = merchantCode + merchantRef + amount;
  return crypto.createHmac("sha256", privateKey).update(data).digest("hex");
};

export const validateTripayCallback = (jsonBody: string, signature: string): boolean => {
  const privateKey = process.env.TRIPAY_PRIVATE_KEY || "";
  const calculatedSignature = crypto.createHmac("sha256", privateKey).update(jsonBody).digest("hex");
  return calculatedSignature === signature;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const formatPhone = (phone: string): string => {
  // Ensure phone starts with 628
  let formatted = phone.replace(/\D/g, "");
  if (formatted.startsWith("0")) {
    formatted = "62" + formatted.substring(1);
  } else if (!formatted.startsWith("62")) {
    formatted = "62" + formatted;
  }
  return formatted;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};
