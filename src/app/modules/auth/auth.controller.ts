import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { authService } from "./auth.service";
import sendResponse from "../../../shared/sendResponse";

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.loginUserIntoDB(req.body);

  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User successfully logged in",
    data: result,
  });
});
const authLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.authLoginIntoDB(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User successfully logged in",
    data: result,
  });
});

const updateUserLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const updatedUser = await authService.userLocationUpdateInDB(id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User location added successfully",
    data: updatedUser,
  });
});

const sendForgotPasswordOtp = catchAsync(
  async (req: Request, res: Response) => {
    const email = req.body.email as string;
    const response = await authService.sendForgotPasswordOtpDB(email);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "OTP send successfully",
      data: response,
    });
  }
);
const resendForgotPasswordOtp = catchAsync(
  async (req: Request, res: Response) => {
    const response = await authService.resendForgotPasswordOTP(
      req.query.email as string
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "OTP resend successfully",
      data: response,
    });
  }
);

const verifyForgotPasswordOtpCode = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    const response = await authService.verifyForgotPasswordOtpCodeDB(payload);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "OTP verified successfully.",
      data: response,
    });
  }
);

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { newPassword } = req.body;
  const result = await authService.resetForgotPasswordDB(newPassword, userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Password updated successfully.",
    data: result,
  });
});

const getProfile = catchAsync(async (req: any, res: Response) => {
  const { id } = req.user;
  const user = await authService.getProfileFromDB(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile retrieved successfully",
    data: user,
  });
});

const updateProfile = catchAsync(async (req: any, res: Response) => {
  const updatedUser = await authService.updateProfileIntoDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile set successfully",
    data: updatedUser,
  });
});
const changePassword = catchAsync(async (req: any, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  await authService.changePasswordFromDB(req.user.id, newPassword, oldPassword);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "password changes successfully",
  });
});
const markActive = catchAsync(async (req: any, res: Response) => {
  const providerId = req.params.id;
  await authService.markProviderAsActiveIntoDB(providerId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Provider verified successfully",
  });
});
const updateIdCard = catchAsync(async (req: any, res: Response) => {
  await authService.updateIdCardIntoDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Id card updated successfully",
  });
});
const toggleUserBlocking = catchAsync(async (req: any, res: Response) => {
  const result = await authService.handleToggleUserBlocking(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `${result.message}`,
  });
});

export const authController = {
  loginUser,
  getProfile,
  toggleUserBlocking,
  updateProfile,
  updateIdCard,
  updateUserLocation,
  markActive,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtpCode,
  resetPassword,
  resendForgotPasswordOtp,
  authLogin,
  changePassword,
};
