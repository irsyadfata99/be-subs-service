import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken"; // ← Tambahkan SignOptions
import db from "../../models";
import { AppError } from "../middleware/errorHandler";
import { addDays } from "../utils/helpers";
import { AuthRequest } from "../middleware/auth";

const { Client } = db;

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { business_name, business_type, email, password, phone, logo_url } =
      req.body;

    const existingClient = await Client.findOne({ where: { email } });
    if (existingClient) {
      throw new AppError("Email already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const trialEndsAt = addDays(new Date(), 30);

    const client = await Client.create({
      business_name,
      business_type,
      email,
      password: hashedPassword,
      phone,
      logo_url,
      status: "trial",
      trial_ends_at: trialEndsAt,
    });

    // Fix JWT sign
    const token = jwt.sign(
      { id: client.id, email: client.email },
      process.env.JWT_SECRET as string, // ← Cast to string
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions // ← Cast SignOptions
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        client: {
          id: client.id,
          business_name: client.business_name,
          email: client.email,
          status: client.status,
          trial_ends_at: client.trial_ends_at,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const client = await Client.findOne({ where: { email } });
    if (!client) {
      throw new AppError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, client.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    // Fix JWT sign
    const token = jwt.sign(
      { id: client.id, email: client.email },
      process.env.JWT_SECRET as string, // ← Cast to string
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions // ← Cast SignOptions
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        client: {
          id: client.id,
          business_name: client.business_name,
          email: client.email,
          status: client.status,
          trial_ends_at: client.trial_ends_at,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const client = await Client.findByPk(req.user?.id, {
      attributes: { exclude: ["password"] },
    });

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
};
