import express from "express";
import { UserControllers } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";

const router = express.Router();

router.post(
  "/pending",
  validateRequest(userValidation.userRegisterValidationSchema),
  UserControllers.createPendingUser
);
router.post("/otp-resend", UserControllers.resendOTP);

router.post("/create", UserControllers.createUser);
router.post("/create/provider", UserControllers.createProvider);
router.post("/social-login", UserControllers.socialLogin);
router.post("/social-login/provider", UserControllers.socialLoginProvider);
router.get("/", UserControllers.getUsers);
router.get("/providers", UserControllers.getProviders);
router.get("/single/:id", UserControllers.getSingleUser);
router.get("/time", UserControllers.userByTIme);
router.put(
  "/:id",
  validateRequest(userValidation.userUpdateValidationSchema),
  auth(UserRole.ADMIN),
  UserControllers.updateUser
);
router.delete("/:id", auth(UserRole.ADMIN), UserControllers.deleteUser);
router.get("/analysis", UserControllers.adminAnalysis);
router.post("/toggle-favourite/:id",auth(UserRole.USER), UserControllers.toggleFavourteService);
router.get("/favourite-service",auth(UserRole.USER), UserControllers.getFavourites);
router.get("/restricted-providers",auth(UserRole.USER), UserControllers.getRestrics);
router.post("/toggle-restrict/:id",auth(UserRole.USER), UserControllers.toggleRestrict);

export const userRoutes = router;
