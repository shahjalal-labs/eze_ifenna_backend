import { Review, UserReview } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import Stripe from "stripe";
import config from "../../../config";
import { sendSingleNotification } from "../notifications/notification.services";
import { getAccessToken } from "../payment/payment.service";
import axios from "axios";

const PAYPAL_API = "https://api-m.sandbox.paypal.com";
const stripe = new Stripe(config.stripe.stripe_secret as string);

const createReviewIntoDB = async (
  userId: string,
  bookingId: string,
  payload: Review
) => {
  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!existingBooking) {
    throw new ApiError(404, "Booking not found");
  }

  const existingUser = await prisma.user.findMany({
    where: {
      id: userId,
      role: "USER",
    },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        comment: payload.comment,
        rating: payload.rating,
        bookingId,
        userId,
        providerId: existingBooking?.providerId,
        subCatId: existingBooking?.subCatId,
      },
    });
    const stats = await tx.review.aggregate({
      where: { providerId: existingBooking.providerId },
      _count: { _all: true },
      _avg: { rating: true },
    });
    await tx.user.update({
      where: { id: existingBooking.providerId },
      data: {
        totalReview: stats._count._all,
        avgRating: parseFloat((stats._avg.rating || 0).toFixed(2)),
      },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        reviewedByUser: true,
      },
    });
    await tx.subCategory.update({
      where: { id: existingBooking.subCatId },
      data: {
        totalReview: stats._count._all,
        avgRating: parseFloat((stats._avg.rating || 0).toFixed(2)),
      },
    });

    return review;
  });

  return result;
};
const createReviewProviderToUserIntoDB = async (
  proivderId: string,
  bookingId: string,
  payload: UserReview
) => {
  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!existingBooking) {
    throw new ApiError(404, "Booking not found");
  }

  const existingProvider = await prisma.user.findUnique({
    where: {
      id: proivderId,
      role: "PROVIDER",
    },
  });

  if (!existingProvider) {
    throw new ApiError(404, "Provider not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.userReview.create({
      data: {
        comment: payload.comment,
        rating: payload.rating,
        bookingId,
        userId: existingBooking.customerId,
        providerId: proivderId,
      },
    });
    const stats = await tx.userReview.aggregate({
      where: { userId: existingBooking.customerId },
      _count: { _all: true },
      _avg: { rating: true },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        reviewdByProvider: true,
      },
    });
    await tx.user.update({
      where: { id: existingBooking.customerId },
      data: {
        totalReview: stats._count._all,
        avgRating: parseFloat((stats._avg.rating || 0).toFixed(2)),
      },
    });

    return review;
  });

  return result;
};
// const createReviewIntoDB = async (
//   userId: string,
//   providerId: string,
//   payload: Review
// ) => {
//   const existingUser = await prisma.user.findMany({
//     where: {
//       OR: [
//         { id: userId, role: "USER" },
//         { id: providerId, role: "PROVIDER" },
//       ],
//     },
//   });

//   if (existingUser.length !== 2) {
//     throw new ApiError(404, "User or provider not found");
//   }

//   const result = await prisma.$transaction(async (tx) => {
//     const review = await tx.review.create({
//       data: {
//         comment: payload.comment,
//         rating: payload.rating,
//         userId,
//         providerId,
//       },
//     });
//     const stats = await tx.review.aggregate({
//       where: { providerId },
//       _count: { _all: true },
//       _avg: { rating: true },
//     });
//     await tx.user.update({
//       where: { id: providerId },
//       data: {
//         totalReview: stats._count._all,
//         avgRating: parseFloat((stats._avg.rating || 0).toFixed(2)),
//       },
//     });

//     return review;
//   });

//   return result;
// };

const giveTipToProvider = async (payload: any) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: booking.customerId },
  });
  const provider = await prisma.user.findUniqueOrThrow({
    where: { id: booking.providerId },
  });

  await stripe.paymentMethods.attach(payload.paymentMethodId as string, {
    customer: user?.stripeCustomerId as string,
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(payload.tip * 100),
    currency: "usd",
    customer: user?.stripeCustomerId,
    confirm: true,
    payment_method: payload.paymentMethodId as string,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
    transfer_data: {
      destination: provider.stripeCustomerId,
    },
    application_fee_amount: Math.round(payload.tip * 0.044 * 100),
  });

  if (paymentIntent.status === "succeeded") {
    await prisma.booking.update({
      where: { id: payload.bookingId },
      data: { tip: { increment: payload.tip } },
    });
    try {
      await sendSingleNotification(
        provider.id,
        `${user.userName} just sent you a tip of $${payload.tip}! 🎉`,
        user.id,
        "You’ve Received a Tip!"
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
    return;
  } else {
    throw new ApiError(400, "Payment failed");
  }
};

const giveTipThroughPaypal = async (payload: any) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId },
  });

  const token = await getAccessToken();

  const orderRes = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: booking.id,
          amount: {
            currency_code: "USD",
            value: payload.tip.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: "http://10.0.20.36:8016/success",
        cancel_url: "http://10.0.20.36:8016/cancel",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const approvalLink = orderRes.data.links.find(
    (link: any) => link.rel === "approve"
  )?.href;

  return {
    approvalUrl: approvalLink,
  };
};

const verifyTipThroughPaypal = async (bookingId: string, amount: number) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });

  const provider = await prisma.user.findUniqueOrThrow({
    where: { id: booking.providerId },
  });

  const tip = Math.round(amount);

  const transfer = await stripe.transfers.create({
    amount: Math.round(tip * 96),
    currency: "usd",
    destination: provider.stripeCustomerId,
  });
  if (!transfer.reversed) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { isPaymentShared: true },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { tip: { increment: tip } },
    });
  }

  return;
};

const getUserWiseReviewsFromDB = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  const reviews = await prisma.userReview.findMany({
    where: { userId },
    include: {
      booking: {
        select: {
          service: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });
  return {
    avgRating: user.avgRating,
    totalReivew: user.totalReview,
    reviews,
  };
};
const getProviderWiseReviewsFromDB = async (providerId: string) => {
  const provider = await prisma.user.findUniqueOrThrow({
    where: { id: providerId, role: "PROVIDER" },
  });

  const reviews = await prisma.review.findMany({
    where: { providerId },
    include: {
      booking: {
        select: {
          service: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });
  return {
    avgRating: provider.avgRating,
    totalReivew: provider.totalReview,
    reviews,
  };
};

export const reviewServices = {
  createReviewIntoDB,
  giveTipToProvider,
  createReviewProviderToUserIntoDB,
  giveTipThroughPaypal,
  verifyTipThroughPaypal,
  getUserWiseReviewsFromDB,
  getProviderWiseReviewsFromDB,
};
