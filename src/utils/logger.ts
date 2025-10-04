import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const logDir = "logs";

// ✅ ADD: Mask sensitive data
const maskSensitiveData = winston.format((info) => {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "apiKey",
    "accessToken",
    "privateKey",
    "authorization",
    "cookie",
    "sessionId",
  ];

  const mask = (obj: any): any => {
    if (typeof obj !== "object" || obj === null) return obj;

    const masked = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in masked) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some((k) => lowerKey.includes(k.toLowerCase()))) {
        masked[key] = "***MASKED***";
      } else if (typeof masked[key] === "object") {
        masked[key] = mask(masked[key]);
      }
    }

    return masked;
  };

  return mask(info);
});

// Define log format
const logFormat = winston.format.combine(
  maskSensitiveData(), // ✅ ADD THIS
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ""
    }`;
  })
);

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: { service: "payment-reminder-api" },
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxFiles: "30d",
      maxSize: "20m",
    }),
    // Combined logs
    new DailyRotateFile({
      filename: path.join(logDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      maxSize: "20m",
    }),
  ],
});

// Console logging for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export default logger;
