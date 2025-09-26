import express from "express";
import * as authController from "../controllers/authController";
import { validate, schemas } from "../middleware/validator";
import { verifyToken } from "../middleware/auth";

const router = express.Router();

router.post("/register", validate(schemas.register), authController.register);
router.post("/login", validate(schemas.login), authController.login);
router.get("/me", verifyToken, authController.getMe);
router.post("/logout", verifyToken, authController.logout);

export default router;
