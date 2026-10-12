import express from "express";
import auth from "../../middlewares/auth";
import { PaymentController } from "./payment.controller";

const router = express.Router();

router.post(
  "/create-payment",
  // auth(),
  // validateRequest(PaymentValidation.ceratePayment),
  PaymentController.createPayment
);

router.post(
  "/capture-payment/:orderId",
  // auth(),
  PaymentController.capturePayment
);

router.get("/my-paid-invoice", auth(), PaymentController.getMyPaidInvoice);

router.get("/my-unpaid-invoice", auth(), PaymentController.getMyUnpaidInvoice);

export const PaymentRouters = router;
