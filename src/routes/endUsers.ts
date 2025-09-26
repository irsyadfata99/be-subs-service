import express from "express";
import * as endUserController from "../controllers/endUserController";
import { validate, schemas } from "../middleware/validator";
import { verifyToken } from "../middleware/auth";

const router = express.Router();

router.use(verifyToken);

router.post(
  "/",
  validate(schemas.createEndUser),
  endUserController.createEndUser
);
router.get("/", endUserController.getEndUsers);
router.get("/:id", endUserController.getEndUser);
router.put(
  "/:id",
  validate(schemas.updateEndUser),
  endUserController.updateEndUser
);
router.delete("/:id", endUserController.deleteEndUser);

export default router;
