import { z } from "zod";

const ceratePayment = z.object({
  body: z.object({
    serviceId: z.string({
      required_error: "Service id is required",
    }),
    amount: z.number({
      required_error: "Amount is required",
    }),
  }),
});

const captureOrder = z.object({
  params: z.object({
    orderId: z.string({
      required_error: "Order id is required",
    }),
  }),
});

export const PaymentValidation = { ceratePayment, captureOrder };
