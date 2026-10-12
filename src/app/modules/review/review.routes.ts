import express from "express";
import { reviewController } from "./review.controller";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post("/create", auth(UserRole.USER), reviewController.createReview);
router.post(
  "/create-provider",
  auth(UserRole.PROVIDER),
  reviewController.createProviderToUserReview
);
router.post("/tip", reviewController.giveTip);
router.post("/tip-paypal", reviewController.giveTipThroughPaypal);
router.get(
  "/user-wise",
  auth(UserRole.USER),
  reviewController.getUserWiseReviews
);
router.get(
  "/provider-wise",
  auth(UserRole.PROVIDER),
  reviewController.getProviderWiseReviews
);

export const reviewRoute = router;
