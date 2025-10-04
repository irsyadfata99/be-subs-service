import { Request, Response, NextFunction } from "express";

export const timeout = (seconds: number = 30) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: "Request timeout",
        });
      }
    }, seconds * 1000);

    res.on("finish", () => clearTimeout(timeoutId));
    res.on("close", () => clearTimeout(timeoutId));

    next();
  };
};
