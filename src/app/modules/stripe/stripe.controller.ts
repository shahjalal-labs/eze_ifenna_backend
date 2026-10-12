import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import { stripeService } from "./stripe.service";

const createSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const result = await stripeService.createMonthlySubscriptionPlan();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Subscription plan created successfully",
      data: result,
    });
  }
);

const getAllSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const result = await stripeService.getAllSubscriptionPlanIntoDB();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Subscription plan retrieved successfully",
      data: result,
    });
  }
);

const createSubscription = catchAsync(async (req: Request, res: Response) => {
  const { priceId, paymentMethodId } = req.body;
  const userId = req.user.id as string;

  const result = await stripeService.createSubscriptionIntoDB(
    priceId,
    paymentMethodId,
    userId
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription created successfully",
    data: result,
  });
});
const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id as string;
  await stripeService.cancelSubscriptionFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription cancelled successfully",
  });
});

export const stripeController = {
  createSubscriptionPlan,
  getAllSubscriptionPlan,
  createSubscription,
  cancelSubscription
};
