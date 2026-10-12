import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { reviewServices } from "./review.service";

const createReview = catchAsync(async (req, res) => {
  const result = await reviewServices.createReviewIntoDB(
    req.user.id,
    req.body.bookingId,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "review  created successfully",
    data: result,
  });
});
const createProviderToUserReview = catchAsync(async (req, res) => {
  const result = await reviewServices.createReviewProviderToUserIntoDB(
    req.user.id,
    req.body.bookingId,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "review submitted created successfully",
    data: result,
  });
});
const giveTip = catchAsync(async (req, res) => {
  const result = await reviewServices.giveTipToProvider(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Tip given successfully",
    data: result,
  });
});
const giveTipThroughPaypal = catchAsync(async (req, res) => {
  const result = await reviewServices.giveTipThroughPaypal(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Tip given successfully",
    data: result,
  });
});
const getUserWiseReviews = catchAsync(async (req, res) => {
  const result = await reviewServices.getUserWiseReviewsFromDB(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reviews retrieved successfully",
    data: result,
  });
});
const getProviderWiseReviews = catchAsync(async (req, res) => {
  const result = await reviewServices.getProviderWiseReviewsFromDB(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reviews retrieved successfully",
    data: result,
  });
});

export const reviewController = {
  createReview,
  giveTip,
  giveTipThroughPaypal,
  createProviderToUserReview,
  getUserWiseReviews,
  getProviderWiseReviews
};
