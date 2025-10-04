import express from "express";
import * as authController from "../controllers/authController";
import { validate, schemas } from "../middleware/validator";
import { verifyToken } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";

const router = express.Router();

router.post(
  "/register",
  authLimiter,
  validate(schemas.register),
  authController.register
);

router.post(
  "/login",
  authLimiter,
  validate(schemas.login),
  authController.login
);

router.get("/me", verifyToken, authController.getMe);

router.post("/logout", verifyToken, authController.logout);

router.post(
  "/change-password",
  verifyToken,
  validate(schemas.changePassword),
  authController.changePassword
);

router.put(
  "/profile",
  verifyToken,
  validate(schemas.updateProfile),
  authController.updateProfile
);

export default router;
