import { Request, Response } from 'express';

import httpStatus from 'http-status';

import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { paypalServices } from './paypal.service';

const createSubscription = catchAsync(async (req: Request, res: Response) => {
  const id = req.user.id
  const result = await paypalServices.createSubscription(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subsciption url generated successfully",
    data: result,
  });
});
const cancelSubscription = catchAsync(async (req: Request, res: Response) => {
  const id = req.user.id
  const result = await paypalServices.cancelSubscription(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subsciption cancelled successfully",
    data: result,
  });
});

export const paypalController = {
    createSubscription,
    cancelSubscription
}