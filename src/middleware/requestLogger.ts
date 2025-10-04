import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // ✅ Generate unique request ID
  req.id = uuidv4();

  // ✅ Add to response headers for client-side debugging
  res.setHeader("X-Request-ID", req.id);

  const start = Date.now();

  // Log request
  logger.info("Incoming request", {
    requestId: req.id, // ✅ ADD request ID
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Log response
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("Request completed", {
      requestId: req.id, // ✅ ADD request ID
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};
