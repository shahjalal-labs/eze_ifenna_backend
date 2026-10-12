import { Router } from "express";
import { stripeController } from "./stripe.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = Router();
router.post(
  "/create-subscription-plan",
  auth(), 
  stripeController.createSubscriptionPlan
);

router.get(
  "/get-subscription-plans",
  stripeController.getAllSubscriptionPlan
);

router.post(
  "/create-subscription",
  auth(UserRole.USER),
  stripeController.createSubscription
);
router.put(
  "/cancel-subscription",
  auth(UserRole.USER),
  stripeController.cancelSubscription
);

export const stripeRoutes = router;
