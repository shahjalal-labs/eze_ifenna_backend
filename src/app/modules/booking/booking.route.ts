import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { bookingController } from "./booking.controller";
import { bookingValidationSchema } from "./booking.validation";

const router = express.Router();

router.post(
  "/create/stripe",
  auth(UserRole.USER),
  validateRequest(bookingValidationSchema.bookingSchema),
  bookingController.createBooking
);
router.post(
  "/create/paypal",
  auth(),
  // validateRequest(PaymentValidation.ceratePayment),
  bookingController.createPaypalPayment
);

router.post(
  "/capture-payment/:id",
  // auth(),
  bookingController.capturePayment
);
router.get("/details/:id", auth(), bookingController.bookingDetails);

router.get("/user", auth(UserRole.USER), bookingController.getUserBookings);
router.get(
  "/provider",
  auth(UserRole.PROVIDER),
  bookingController.getProviderBookings
);
router.put(
  "/update/active/:id",
  auth(UserRole.PROVIDER),
  bookingController.updateToActive
);
router.put("/update/cancel", auth(), bookingController.updateToCancelled);
router.put("/complete/stripe/:id", bookingController.updateToCompleted);
router.put("/complete/:id", auth(), bookingController.markCompleted);
router.post("/share-payment/:id", bookingController.sharePayment);
router.get("/all", bookingController.allBookings);
router.get(
  "/earnings",
  auth(UserRole.PROVIDER),
  bookingController.providerEarnings
);
router.put(
  "/update-price",
  auth(),
  bookingController.requestPriceUpdate
);
router.patch(
  "/reject-update/:id",
  auth(),
  bookingController.rejectUpdatePrice
);
router.put(
  "/accept-update",
  auth(),
  bookingController.acceptUpdatePrice
);
router.put(
  "/accept-update-paypal",
  auth(),
  bookingController.acceptUpdatePriceThroughPaypal
);
router.get(
  "/earning-summary",

  bookingController.getSummary
);

export const bookingRoutes = router;
