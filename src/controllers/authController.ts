import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
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

    const token = jwt.sign(
      { id: client.id, email: client.email },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions
    );

    return res.status(201).json({
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

    const token = jwt.sign(
      { id: client.id, email: client.email },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as SignOptions
    );

    return res.json({
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

    return res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: "Logout successful",
  });
};

// PHASE 2: Change Password
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { old_password, new_password } = req.body;
    const clientId = req.user?.id;

    const client = await Client.findByPk(clientId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(old_password, client.password);
    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await client.update({ password: hashedPassword });

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// PHASE 2: Update Profile
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { business_name, phone, logo_url } = req.body;
    const clientId = req.user?.id;

    const client = await Client.findByPk(clientId);
    if (!client) {
      throw new AppError("Client not found", 404);
    }

    await client.update({
      business_name: business_name || client.business_name,
      phone: phone || client.phone,
      logo_url: logo_url || client.logo_url,
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: client.id,
        business_name: client.business_name,
        business_type: client.business_type,
        email: client.email,
        phone: client.phone,
        logo_url: client.logo_url,
        status: client.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
