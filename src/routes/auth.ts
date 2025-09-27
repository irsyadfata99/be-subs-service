import express from "express";
import * as authController from "../controllers/authController";
import { validate, schemas } from "../middleware/validator";
import { verifyToken } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";

const router = express.Router();

// Debug: Check what's exported
console.log("AUTH CONTROLLER EXPORTS:", Object.keys(authController));

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

// Phase 2 routes
console.log("Registering /change-password route...");
router.post(
  "/change-password",
  verifyToken,
  validate(schemas.changePassword),
  authController.changePassword
);

console.log("Registering /profile route...");
router.put(
  "/profile",
  verifyToken,
  validate(schemas.updateProfile),
  authController.updateProfile
);

export default router;
