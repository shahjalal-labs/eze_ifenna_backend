import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { serviceController } from "./service.controller";
import validateRequest from "../../middlewares/validateRequest";
import { serviceValidationSchema } from "./service.validation";

const router = express.Router();

router.post(
  "/create",
  auth(UserRole.PROVIDER),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(serviceValidationSchema.serviceSchema),
  serviceController.createService,
);

router.get("/workers/:id", auth(), serviceController.getWorkers);
router.put(
  "/update",
  fileUploader.uploadMultiple,
  parseBodyData,
  serviceController.updateService,
);

router.get("/all", serviceController.getServices);
router.get(
  "/provider-service",
  auth(UserRole.PROVIDER),
  serviceController.getMyServices,
);
router.get("/details/:id", serviceController.serviceDetails);
router.post("/worker-details", auth(), serviceController.getWorkerDetails);
router.get("/provider-profile/:id", auth(), serviceController.providerProfile);
router.get("/user-profile/:id", serviceController.userProfile);
router.put(
  "/accept-reject-service",
  auth(UserRole.ADMIN),
  serviceController.acceptRejectService,
);
router.get("/provider-profile-admin/:id", auth(), serviceController.providerProfileForAdmin);

export const serviceRoutes = router;
