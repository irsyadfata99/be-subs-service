import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

// Prevent XXE attacks
export const sanitizeXML = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const contentType = req.get("content-type");

  if (contentType?.includes("xml")) {
    throw new AppError("XML content not accepted", 400);
  }

  next();
};

// Prevent oversized payloads
export const validatePayloadSize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get("content-length") || "0");

    if (contentLength > maxSize) {
      throw new AppError("Payload too large", 413);
    }

    next();
  };
};
