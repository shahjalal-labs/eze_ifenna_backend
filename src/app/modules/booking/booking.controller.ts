import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { bookingServices } from "./booking.service";

const createBooking = catchAsync(async (req, res) => {
  const result = await bookingServices.createBookingIntoDB(
    req.user.id,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Booking created successfully",
    data: result,
  });
});

const createPaypalPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.createBookingThroughtPaypalIntoDB(
    req.user.id,
    req.body
  );
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Booking created successfully",
    data: result,
  });
});

const capturePayment = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.id;
  const result = await bookingServices.captureOrder(orderId);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Payment captured successfully",
    data: result,
  });
});

const getUserBookings = catchAsync(async (req, res) => {
  const result = await bookingServices.getUserBookingsFromDb(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Bookings retrieved successfully",
    data: result,
  });
});
const bookingDetails = catchAsync(async (req, res) => {
  const result = await bookingServices.getBookingDetailsFromDB(
    req.user.id,
    req.params.id
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Booking details retrieved successfully",
    data: result,
  });
});
const getProviderBookings = catchAsync(async (req, res) => {
  const result = await bookingServices.getProviderBookingsFromDb(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Bookings retrieved successfully",
    data: result,
  });
});
const updateToActive = catchAsync(async (req, res) => {
  const result = await bookingServices.updateBookingStatusToActive(
    req.params.id
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Bookings status updated to active",
    data: result,
  });
});
const updateToCancelled = catchAsync(async (req, res) => {
  const { bookingId, reason } = req.body;
  const result = await bookingServices.updateBookingStatusToCancelled(
    bookingId,
    req.user.id,
    reason
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Bookings cancelled",
    data: result,
  });
});
const markCompleted = catchAsync(async (req, res) => {
  const id = req.params.id;
  const result = await bookingServices.updateBookingStatusToCompletedd(
    id,
    req.user.id
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Bookings completed",
    data: result,
  });
});
const updateToCompleted = catchAsync(async (req, res) => {
  await bookingServices.confirmPaymentThroughStripe(
    req.params.id,
    req.query.paymentMethodId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Payment done, Booking marked as completed",
  });
});
const allBookings = catchAsync(async (req, res) => {
  const result = await bookingServices.getAllBookingsFromDb();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Bookings retrived completed",
    data: result,
  });
});

const sharePayment = catchAsync(async (req, res) => {
  const result = await bookingServices.shareProvidersTheirPayment(
    req.params.id
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Payment transferred successfully",
    data: result,
  });
});

const providerEarnings = catchAsync(async (req, res) => {
  const result = await bookingServices.getProvdiderEarningsFromDB(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Earnings retrived completed",
    data: result,
  });
});
const requestPriceUpdate = catchAsync(async (req, res) => {
  const result = await bookingServices.requestUpdatePriceIntoDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Price update request sent successfully",
    data: result,
  });
});
const rejectUpdatePrice = catchAsync(async (req, res) => {
  await bookingServices.rejectPriceUpdateRequest(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Price update request declined successfully",
  });
});
const acceptUpdatePrice = catchAsync(async (req, res) => {
  await bookingServices.acceptPriceUpdateIntoDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Price update request accepted successfully",
  });
});
const acceptUpdatePriceThroughPaypal = catchAsync(async (req, res) => {
  const result =await bookingServices.acceptPriceUpdateThroughPaypalIntoDB(req.body.bookingId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Paymnet url generated successfully",
    data: result
  });
});
const getSummary = catchAsync(async (req, res) => {
  const result =await bookingServices.getSummaryFromDB();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Paymnet url generated successfully",
    data: result
  });
});

export const bookingController = {
  createBooking,
  getUserBookings,
  getProviderBookings,
  acceptUpdatePrice,
  getSummary,
  rejectUpdatePrice,
  acceptUpdatePriceThroughPaypal,
  bookingDetails,
  sharePayment,
  requestPriceUpdate,
  updateToActive,
  updateToCancelled,
  updateToCompleted,
  markCompleted,
  createPaypalPayment,
  capturePayment,
  allBookings,
  providerEarnings,
};
