import logger from "./logger";

interface EnvConfig {
  [key: string]: {
    required: boolean;
    default?: string;
  };
}

const requiredEnvVars: EnvConfig = {
  // Server
  PORT: { required: false, default: "5000" },
  NODE_ENV: { required: false, default: "development" },

  // Database
  DB_HOST: { required: true },
  DB_USER: { required: true },
  DB_PASSWORD: { required: false, default: "" },
  DB_NAME: { required: true },
  DB_PORT: { required: false, default: "3306" },

  // JWT
  JWT_SECRET: { required: true },
  JWT_EXPIRES_IN: { required: false, default: "7d" },

  // ✅ CHANGED: Twilio WhatsApp API
  TWILIO_ACCOUNT_SID: { required: true },
  TWILIO_AUTH_TOKEN: { required: true },
  TWILIO_WHATSAPP_FROM: { required: true },

  // Tripay
  TRIPAY_API_URL: { required: true },
  TRIPAY_API_KEY: { required: true },
  TRIPAY_PRIVATE_KEY: { required: true },
  TRIPAY_MERCHANT_CODE: { required: true },
  TRIPAY_MODE: { required: false, default: "sandbox" },

  // Frontend
  FRONTEND_URL: { required: true },

  // Optional
  SENTRY_DSN: { required: false },
  ADMIN_WHATSAPP_NUMBERS: { required: false },
};

export const validateEnvironment = (): void => {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];

    if (!value && config.required) {
      errors.push(`❌ Missing required environment variable: ${key}`);
    } else if (!value && config.default) {
      process.env[key] = config.default;
      warnings.push(`⚠️  Using default for ${key}: ${config.default}`);
    }
  }

  if (warnings.length > 0) {
    warnings.forEach((warning) => logger.warn(warning));
  }

  if (errors.length > 0) {
    errors.forEach((error) => logger.error(error));
    throw new Error("Environment validation failed. Check logs above.");
  }

  logger.info("✅ Environment validation passed (Twilio WhatsApp configured)");
};
