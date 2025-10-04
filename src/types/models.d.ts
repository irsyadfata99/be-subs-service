// src/types/models.d.ts
declare module "../../models" {
  import { Sequelize, Model } from "sequelize";

  interface ClientAttributes {
    id: number;
    business_name: string;
    business_type: string;
    email: string;
    password: string;
    phone?: string;
    logo_url?: string;
    status: "trial" | "active" | "suspended";
    trial_ends_at?: Date;
    total_users: number;
    monthly_bill: number;
    created_at: Date;
    updated_at: Date;
  }

  interface EndUserAttributes {
    id: number;
    client_id: number;
    name: string;
    phone: string;
    package_name: string;
    package_price: number;
    billing_cycle: string;
    due_date: Date;
    status: "active" | "overdue" | "inactive";
    last_reminder_sent?: Date;
    created_at: Date;
    updated_at: Date;
  }

  interface ReminderAttributes {
    id: number;
    client_id: number;
    end_user_id: number;
    phone: string;
    message: string;
    type: "before_3days" | "before_1day" | "overdue";
    status: "sent" | "failed";
    response?: any;
    sent_at?: Date;
    created_at: Date;
    updated_at: Date;
  }

  interface PlatformInvoiceAttributes {
    id: number;
    client_id: number;
    invoice_number: string;
    period_month: number;
    period_year: number;
    total_users: number;
    price_per_user: number;
    total_amount: number;
    due_date: Date;
    status: "pending" | "paid" | "overdue" | "expired" | "cancelled";
    tripay_reference?: string;
    tripay_merchant_ref?: string;
    payment_method?: string;
    checkout_url?: string;
    pay_code?: string;
    total_fee?: number;
    amount_received?: number;
    paid_at?: Date;
    expired_at?: Date;
    created_at: Date;
    updated_at: Date;
  }

  interface DB {
    sequelize: Sequelize;
    Sequelize: typeof Sequelize;
    Client: Model<ClientAttributes> & {
      findByPk: any;
      findOne: any;
      findAll: any;
      create: any;
      update: any;
    };
    EndUser: Model<EndUserAttributes> & {
      findByPk: any;
      findOne: any;
      findAll: any;
      findAndCountAll: any;
      create: any;
      update: any;
      count: any;
    };
    Reminder: Model<ReminderAttributes> & {
      findByPk: any;
      findOne: any;
      findAll: any;
      findAndCountAll: any;
      create: any;
      update: any;
      count: any;
    };
    PlatformInvoice: Model<PlatformInvoiceAttributes> & {
      findByPk: any;
      findOne: any;
      findAll: any;
      findAndCountAll: any;
      create: any;
      update: any;
      count: any;
    };
  }

  const db: DB;
  export = db;
}
