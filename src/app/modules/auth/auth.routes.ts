import express from "express";
import { authController } from "./auth.controller";
import validateRequest from "../../middlewares/validateRequest";
import { authValidation } from "./auth.validation";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

//login user
router.post(
  "/login",
  validateRequest(authValidation.authLoginSchema),
  authController.loginUser
);

router.post("/social/login", authController.authLogin);

router.get("/profile", auth(), authController.getProfile);

router.patch(
  "/update/user-location",
  auth(),
  authController.updateUserLocation
);

router.post("/send-otp", authController.sendForgotPasswordOtp);
router.post("/resetOtp-resend", authController.resendForgotPasswordOtp);
router.post("/verify-otp", authController.verifyForgotPasswordOtpCode);
router.patch("/reset-password", auth(), authController.resetPassword);
router.patch("/change-password", auth(), authController.changePassword);
router.patch("/mark-active/:id", authController.markActive);

router.put(
  "/set-profile",
  auth(),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(authValidation.userUpdateValidationSchema),

  authController.updateProfile
);
router.put(
  "/update-idcard",
  auth(),
  fileUploader.uploadMultiple,
  parseBodyData,
  authController.updateIdCard
);
router.patch(
  "/toggle-deactivate/:id",
  authController.toggleUserBlocking
);

export const authRoute = router;
