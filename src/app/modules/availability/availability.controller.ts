import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { availabilityServices } from "./availability.service";

const createAvailability = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.user.id;
  const { availability } = req.body;
  await availabilityServices.createUserAvailability(providerId, availability);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Availability created successfully",
  });
});
const availabilityForDay = catchAsync(async (req: Request, res: Response) => {
  const { providerId, day } = req.body;

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Availabilities retrieved successfully",
  });
});
const getExpertDayWiseSlots = catchAsync(
  async (req: Request, res: Response) => {
    const providerId = req.query.providerId as string;
    const day = parseInt(req.query.day as string);

    const result = await availabilityServices.getExpertDayWiseSlotsFromDB(
      providerId,
      day
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Slots retrieved successfully",
      data: result,
    });
  }
);
const expertAllSlots = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.user.id;
  const result = await availabilityServices.getExpertsAllSlotsFromDB(providerId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Slots retrieved successfully",
    data: result,
  });
});
const addNewSlot = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.user.id;
  const { slot } = req.body;

  await availabilityServices.addNewSlotIntoDB(providerId, slot);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Slot created successfully",
  });
});
const updateSlot = catchAsync(async (req: Request, res: Response) => {
  const { slotId, slot } = req.body;
  const result = await availabilityServices.updateSlotFromDB(slotId, slot);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Slot updated successfully",
    data: result,
  });
});
const deleteSlot = catchAsync(async (req: Request, res: Response) => {
  const slotId = req.params.id;
  await availabilityServices.deleteSlotFromDB(slotId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Slot deleted successfully",
  });
});

export const availabilityController = {
  createAvailability,
  availabilityForDay,
  updateSlot,
  expertAllSlots,
  addNewSlot,
  deleteSlot,
  getExpertDayWiseSlots,
};
