import { Request, Response, NextFunction } from "express";

// Simple XSS sanitization
const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value
      .replace(/[<>]/g, "") // Remove < and >
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }

  return value;
};

export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query) as Record<string, string>;
  }

  if (req.params) {
    req.params = sanitizeValue(req.params) as Record<string, string>;
  }

  next();
};
