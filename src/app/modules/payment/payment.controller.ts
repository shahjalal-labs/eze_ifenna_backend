import { Request, Response } from 'express';

import httpStatus from 'http-status';
import { PaymentService } from "./payment.service";
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const createPayment = catchAsync(async (req: Request, res: Response) => {
  const { amount } = req.body;
  const result = await PaymentService.createPayment(amount);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment created successfully",
    data: result,
  });
});

const capturePayment = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const result = await PaymentService.captureOrder(orderId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment captured successfully",
    data: result,
  });
});

const getMyPaidInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await PaymentService.getMyPaidInvoice(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My paid invoice fetched successfully",
    data: result,
  });
});

const getMyUnpaidInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await PaymentService.getMyUnpaidInvoice(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "My unpaid invoice fetched successfully",
    data: result,
  });
});

export const PaymentController = {
  createPayment,
  capturePayment,
  getMyPaidInvoice,
  getMyUnpaidInvoice,
};
