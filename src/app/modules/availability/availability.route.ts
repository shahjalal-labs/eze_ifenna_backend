import express from "express";
import auth from "../../middlewares/auth";
import { availabilityController } from "./availability.controller";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/create",
  auth(UserRole.PROVIDER),
  availabilityController.createAvailability
);
router.get("/", availabilityController.availabilityForDay);
router.get("/expert-slots", availabilityController.getExpertDayWiseSlots);
router.get(
  "/all-slots",
  auth(UserRole.PROVIDER),
  availabilityController.expertAllSlots
);
router.post("/create-slot",  auth(UserRole.PROVIDER), availabilityController.addNewSlot);
router.put("/update-slot", availabilityController.updateSlot);
router.delete("/slot/:id", availabilityController.deleteSlot);

export const availabilityRoutes = router;
