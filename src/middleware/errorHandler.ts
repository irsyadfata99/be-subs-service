import { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import logger from "../utils/logger";
import { NotificationService } from "../services/notificationService"; // ✅ ADD

interface ApiError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;

  // Log error
  logger.error("Error occurred", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // ✅ ADD: Notify admins of critical errors
  if (statusCode >= 500) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }

    // Notify admins (async, don't wait)
    NotificationService.notifyCriticalError(err, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    }).catch((notifyErr) => {
      logger.error("Failed to send error notification", { error: notifyErr });
    });
  }

  // Production: hide sensitive error details
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== "production" && {
      stack: err.stack,
      details: err.message,
    }),
  });
};

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
