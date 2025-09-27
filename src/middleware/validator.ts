import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { AppError } from "./errorHandler";

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      throw new AppError(errorMessage, 400);
    }

    next();
  };
};

export const schemas = {
  register: Joi.object({
    business_name: Joi.string().required().min(3).max(255),
    business_type: Joi.string().required().min(3).max(100),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(8),
    phone: Joi.string().optional(),
    logo_url: Joi.string().uri().optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createEndUser: Joi.object({
    name: Joi.string().required().min(3).max(255),
    phone: Joi.string()
      .required()
      .pattern(/^628[0-9]{8,12}$/),
    package_name: Joi.string().required().min(3).max(255),
    package_price: Joi.number().required().positive(),
    billing_cycle: Joi.string().optional().default("monthly"),
    due_date: Joi.date().required().iso(),
  }),

  updateEndUser: Joi.object({
    name: Joi.string().optional().min(3).max(255),
    phone: Joi.string()
      .optional()
      .pattern(/^628[0-9]{8,12}$/),
    package_name: Joi.string().optional().min(3).max(255),
    package_price: Joi.number().optional().positive(),
    billing_cycle: Joi.string().optional(),
    due_date: Joi.date().optional().iso(),
    status: Joi.string().optional().valid("active", "overdue", "inactive"),
  }),

  changePassword: Joi.object({
    old_password: Joi.string().required().min(8),
    new_password: Joi.string().required().min(8),
    confirm_password: Joi.string()
      .required()
      .valid(Joi.ref("new_password"))
      .messages({
        "any.only": "Passwords do not match",
      }),
  }),

  updateProfile: Joi.object({
    business_name: Joi.string().optional().min(3).max(255),
    phone: Joi.string().optional(),
    logo_url: Joi.string().uri().optional().allow(""),
  }),
};
