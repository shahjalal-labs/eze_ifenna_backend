import express from "express";
import auth from "../../middlewares/auth";
import { paypalController } from "./paypal.controller";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/create-subsciption",
  auth(UserRole.USER),
  paypalController.createSubscription
);

router.put(
  "/cancel-subscription",
  auth(UserRole.USER),
  paypalController.cancelSubscription
);

export const paypalRoutes = router;
