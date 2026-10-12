import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userService } from "./user.services";

// register user
const createPendingUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.createPendingUserIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Pending User created successfully",
    data: result,
  });
});
// register user
const resendOTP = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.resendVerifyOTP(req.query.email as string);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "OTP resend successfully",
    data: result,
  });
});

// register user
const createUser = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await userService.createUserIntoDB(email, otp);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User created successfully",
    data: result,
  });
});
const createProvider = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await userService.createProviderIntoDB(email, otp);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Provider created successfully",
    data: result,
  });
});
// register user
const socialLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.socialLoginIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User loggedin successfully",
    data: result,
  });
});

//get users
const getUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getUsersIntoDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "users retrived successfully",
    data: users,
  });
});
const getProviders = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getProvidersIntoDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "providers retrived successfully",
    data: users,
  });
});

//get single user
const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getSingleUserIntoDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user retrived successfully",
    data: user,
  });
});

//update user
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const updatedUser = await userService.updateUserIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user updated successfully",
    data: updatedUser,
  });
});
// register user
const socialLoginProvider = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.socialLoginForProviderIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User loggedin successfully",
    data: result,
  });
});

//delete user
const deleteUser = catchAsync(async (req: any, res: Response) => {
  const userId = req.params.id;
  const loggedId = req.user.id;
  await userService.deleteUserIntoDB(userId, loggedId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "user deleted successfully",
  });
});
//delete user
const adminAnalysis = catchAsync(async (req: any, res: Response) => {
  const result = await userService.getAdminAnalysisReportFromDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Analysis retrieved successfully",
    data: result,
  });
});
const toggleFavourteService = catchAsync(async (req: any, res: Response) => {
  const userId = req.user.id;
  const providerId = req.params.id;
  const result = await userService.toggleFavourteProvider(userId, providerId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `${result.message}`,
  });
});
const userByTIme = catchAsync(async (req: any, res: Response) => {
  const result = await userService.getUsersByTime(req.query.type);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Analysis retrieved successfully",
    data: result,
  });
});
const getFavourites = catchAsync(async (req: any, res: Response) => {
  const userId = req.user.id;

  const result = await userService.getFavouriteServicesFromDB(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `Favourite services retrieved successfully`,
    data: result,
  });
});
const getRestrics = catchAsync(async (req: any, res: Response) => {
  const userId = req.user.id;

  const result = await userService.getRestrictionListFromDB(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `Restricted provider list got successfully`,
    data: result,
  });
});

const toggleRestrict = catchAsync(async (req: any, res: Response) => {
  const userId = req.user.id;
  const providerId = req.params.id;
  const result = await userService.toggleRestrictIntoDB(userId, providerId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `${result.message}`,
  });
});

export const UserControllers = {
  createUser,
  createPendingUser,
  getFavourites,
  userByTIme,
  getUsers,
  getSingleUser,
  getRestrics,
  toggleFavourteService,
  updateUser,
  deleteUser,
  toggleRestrict,
  socialLogin,
  resendOTP,
  createProvider,
  socialLoginProvider,
  adminAnalysis,
  getProviders,
};
