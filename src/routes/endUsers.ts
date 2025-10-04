import express from "express";
import * as endUserController from "../controllers/endUserController";
import { validate, schemas } from "../middleware/validator";
import { verifyToken, checkAccountStatus } from "../middleware/auth";

const router = express.Router();

router.use(verifyToken);
router.use(checkAccountStatus);

router.post("/", validate(schemas.createEndUser), endUserController.createEndUser);
router.get("/", endUserController.getEndUsers);
router.get("/:id", endUserController.getEndUser);
router.put("/:id", validate(schemas.updateEndUser), endUserController.updateEndUser);
router.delete("/:id", endUserController.deleteEndUser);
router.post("/:id/mark-paid", endUserController.markAsPaid);
router.post("/bulk/update-status", endUserController.bulkUpdateStatus);
export default router;
