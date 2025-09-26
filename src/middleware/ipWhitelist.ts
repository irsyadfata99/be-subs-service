import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import logger from "../utils/logger";

export const tripayIpWhitelist = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get Tripay IPs from env
  const whitelistIps =
    process.env.TRIPAY_WHITELIST_IPS?.split(",").map((ip) => ip.trim()) || [];

  // Skip in development
  if (
    process.env.NODE_ENV === "development" ||
    process.env.SKIP_EXTERNAL_API === "true"
  ) {
    return next();
  }

  const clientIp = req.ip || req.connection.remoteAddress || "";

  // Check if IP is whitelisted
  if (!whitelistIps.includes(clientIp)) {
    logger.warn(`Unauthorized IP attempt: ${clientIp}`);
    throw new AppError("Unauthorized access", 403);
  }

  next();
};
