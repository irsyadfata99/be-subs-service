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
    phone: Joi.string().optional().allow(""),
    contact_whatsapp: Joi.string()
      .optional()
      .pattern(/^628[0-9]{8,12}$/)
      .allow("")
      .messages({
        "string.pattern.base":
          "WhatsApp number must start with 628 and be 11-15 digits",
      }),
    logo_url: Joi.string().uri().optional().allow(""),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createEndUser: Joi.object({
    name: Joi.string().required(),
    phone: Joi.string().required(),
    package_name: Joi.string().required(),
    package_price: Joi.number().positive().required(),
    billing_cycle: Joi.number().integer().min(1).max(365).required(),
  }),

  updateEndUser: Joi.object({
    name: Joi.string().optional().min(3).max(255),
    phone: Joi.string()
      .optional()
      .pattern(/^628[0-9]{8,12}$/),
    package_name: Joi.string().optional().min(3).max(255),
    package_price: Joi.number().optional().positive(),
    billing_cycle: Joi.number().integer().min(1).max(365).required(),
    status: Joi.string().optional().valid("active", "overdue", "inactive"),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().min(8),
    newPassword: Joi.string().required().min(8),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref("newPassword"))
      .messages({
        "any.only": "Passwords do not match",
      }),
  }),

  updateProfile: Joi.object({
    business_name: Joi.string().optional().min(3).max(255),
    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]{10,20}$/)
      .optional()
      .allow(""),
    contact_whatsapp: Joi.string()
      .optional()
      .pattern(/^628[0-9]{8,12}$/)
      .allow("")
      .messages({
        "string.pattern.base":
          "WhatsApp number must start with 628 and be 11-15 digits",
      }),
    logo_url: Joi.string().uri().optional().allow(""),
  }).or("business_name", "phone", "contact_whatsapp", "logo_url"),
};
