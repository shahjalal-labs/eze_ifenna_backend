import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { serviceServices } from "./service.services";

const createService = catchAsync(async (req, res) => {
  const result = await serviceServices.createServiceIntoDB(req);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Service Created Successfully",
    data: result,
  });
});
const getWorkers = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const serviceId = req.params.id;
  const duration = req.query.duration;
  const avability = req.query.avability;
  const gender = req.query.gender as string;
  const result = await serviceServices.getWorkersBySubCategoryID(
    userId,
    serviceId,
    duration as string,
    avability as string,
    gender,
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Workers retrieved Successfully",
    data: result,
  });
});

const updateService = catchAsync(async (req, res) => {
  const result = await serviceServices.updateServiceFromDb(req);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Service updated Successfully",
    data: result,
  });
});
const getServices = catchAsync(async (req, res) => {
  const result = await serviceServices.getServicesFromDB();

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Services retrieved Successfully",
    data: result,
  });
});
const getMyServices = catchAsync(async (req, res) => {
  const result = await serviceServices.getMyServicesFromDB(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "My services retrieved Successfully",
    data: result,
  });
});
const serviceDetails = catchAsync(async (req, res) => {
  const result = await serviceServices.getServiceDetailsFromDb(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Service details retrieved Successfully",
    data: result,
  });
});
const getWorkerDetails = catchAsync(async (req, res) => {
  const { providerId, subCatId } = req.body;
  const userId = req.user.id;
  const result = await serviceServices.getWorkerDetailsFromDb(
    userId,
    providerId,
    subCatId,
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Worker details retrieved Successfully",
    data: result,
  });
});
const providerProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const providerId = req.params.id;

  const result = await serviceServices.getProviderProfileFromDb(
    userId,
    providerId,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Provider profile retrieved Successfully",
    data: result,
  });
});
const userProfile = catchAsync(async (req, res) => {
  const userId = req.params.id;
  const result = await serviceServices.getUserProfileFromDb(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User profile retrieved Successfully",
    data: result,
  });
});
const acceptRejectService = catchAsync(async (req, res) => {
  const { serviceId, status } = req.body;
  const result = await serviceServices.acceptRejectServiceIntoDB(
    serviceId,
    status,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User profile retrieved Successfully",
    data: result,
  });
});

const providerProfileForAdmin = catchAsync(async (req, res) => {  
  const providerId = req.params.id;

  const result = await serviceServices.getProviderProfileFromDbForAdmin(   
    providerId,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Provider profile retrieved Successfully",
    data: result,
  });
});

export const serviceController = {
  createService,
  getWorkers,
  updateService,
  providerProfile,
  getServices,
  userProfile,
  getWorkerDetails,
  getMyServices,
  serviceDetails,
  acceptRejectService,
  providerProfileForAdmin
};
