import Stripe from "stripe";
import config from "../../../config";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { getAccessToken, refundPayment } from "../payment/payment.service";
import axios from "axios";
import { format } from "date-fns";
import { sendSingleNotification } from "../notifications/notification.services";
import { getMonth } from "date-fns";

const stripe = new Stripe(config.stripe.stripe_secret as string);
const PAYPAL_API = "https://api-m.sandbox.paypal.com";

function calculateFee({ baseFee, percentage, minimumCharge }: any) {
  const percentageCharge = (baseFee * percentage) / 100;
  const charge = Math.max(percentageCharge, minimumCharge);
  return {
    charge,
    totalFee: baseFee + charge,
  };
}

const createBookingIntoDB = async (userId: string, payload: any) => {
  const [existingProvider, existingSubCategory, existingUser] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.providerId, role: "PROVIDER" },
      }),
      prisma.subCategory.findUnique({
        where: { id: payload.subCatId },
      }),
      prisma.user.findUnique({
        where: { id: userId },
      }),
    ]);

  if (!existingProvider) {
    throw new ApiError(404, "Provider not found");
  }

  if (!existingSubCategory) {
    throw new ApiError(404, "Service not found");
  }

  if (!existingUser) {
    throw new ApiError(400, "User not found");
  }

  const existingService = await prisma.service.findFirst({
    where: { subCatId: existingSubCategory.id, providerId: payload.providerId },
  });

  if (!existingService) {
    throw new ApiError(400, "Service not found");
  }

  const baseFee = existingService.fee;

  const percentage = existingUser.isSubscribed
    ? existingSubCategory.hodsCharge
    : existingSubCategory.charge;

  const minimumCharge = existingUser.isSubscribed
    ? existingSubCategory.hodsCharge
    : existingSubCategory.charge;

  // calculate percentage-based charge
  const percentageCharge = (baseFee * percentage) / 100;

  // final charge (enforce minimum)
  const charge = Math.max(percentageCharge, minimumCharge);

  const totalFee = baseFee + charge;

  const stripeAmount = totalFee * 100;

  await stripe.paymentMethods.attach(payload.paymentMethodId as string, {
    customer: existingUser?.stripeCustomerId as string,
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(stripeAmount),
    currency: "usd",
    customer: existingUser?.stripeCustomerId,
    confirm: true,
    payment_method: payload.paymentMethodId as string,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
    // transfer_data: {
    //   destination: existingProvider.stripeCustomerId,
    // },
  });

  if (paymentIntent.status === "succeeded") {
    const booking = await prisma.booking.create({
      data: {
        customerId: userId,
        providerId: payload.providerId,
        subCatId: payload.subCatId,
        serviceId: existingService.id,
        fee: existingService.fee,
        charge: +charge.toFixed(2),
        date: payload.date,
        time: payload.time,
        totalFee: +totalFee.toFixed(2),
        requirement: payload.requirement,
        paymentMethodId: payload.paymentMethodId,
        paymentIntentId: paymentIntent.id,
        isPaymentConfirmed: true,
      },
    });

    try {
      await sendSingleNotification(
        existingProvider.id,
        `${existingUser.userName} has just booked your service: ${existingService.title}. 📅`,
        existingUser.id,
        "New Booking Received!",
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
    return booking;
  } else {
    throw new ApiError(404, "Something went wrong, booking failed");
  }
};
// const createBookingIntoDB = async (userId: string, payload: any) => {
//   const [existingProvider, existingSubCategory, existingUser] =
//     await Promise.all([
//       prisma.user.findUnique({
//         where: { id: payload.providerId, role: "PROVIDER" },
//       }),
//       prisma.subCategory.findUnique({
//         where: { id: payload.subCatId },
//       }),
//       prisma.user.findUnique({
//         where: { id: userId },
//       }),
//     ]);

//   if (!existingProvider) {
//     throw new ApiError(404, "Provider not found");
//   }

//   if (!existingSubCategory) {
//     throw new ApiError(404, "Service not found");
//   }

//   if (!existingUser) {
//     throw new ApiError(400, "User not found");
//   }

//   const existingService = await prisma.service.findFirst({
//     where: { subCatId: existingSubCategory.id, providerId: payload.providerId },
//   });

//   if (!existingService) {
//     throw new ApiError(400, "Service not found");
//   }

//   let totalFee = 0;

//   const baseFee = existingService.fee;
//   const percentage = existingUser.isSubscribed
//     ? existingSubCategory.hodsCharge
//     : existingSubCategory.charge;

//   totalFee = baseFee * (1 + percentage / 100);

//   const charge = totalFee - existingService.fee;

//   const stripeAmount = totalFee * 100;

//   await stripe.paymentMethods.attach(payload.paymentMethodId as string, {
//     customer: existingUser?.stripeCustomerId as string,
//   });

//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: Math.round(stripeAmount),
//     currency: "usd",
//     customer: existingUser?.stripeCustomerId,
//     confirm: true,
//     payment_method: payload.paymentMethodId as string,
//     automatic_payment_methods: {
//       enabled: true,
//       allow_redirects: "never",
//     },
//     // transfer_data: {
//     //   destination: existingProvider.stripeCustomerId,
//     // },
//   });

//   if (paymentIntent.status === "succeeded") {
//     const booking = await prisma.booking.create({
//       data: {
//         customerId: userId,
//         providerId: payload.providerId,
//         subCatId: payload.subCatId,
//         serviceId: existingService.id,
//         fee: existingService.fee,
//         charge: +charge.toFixed(2),
//         date: payload.date,
//         time: payload.time,
//         totalFee: +totalFee.toFixed(2),
//         requirement: payload.requirement,
//         paymentMethodId: payload.paymentMethodId,
//         paymentIntentId: paymentIntent.id,
//         isPaymentConfirmed: true,
//       },
//     });

//     try {
//       await sendSingleNotification(
//         existingProvider.id,
//         `${existingUser.userName} has just booked your service: ${existingService.title}. 📅`,
//         existingUser.id,
//         "New Booking Received!",
//       );
//     } catch (notificationError) {
//       console.error("Notification failed:", notificationError);
//     }
//     return booking;
//   } else {
//     throw new ApiError(404, "Something went wrong, booking failed");
//   }
// };
const createBookingThroughtPaypalIntoDB = async (
  userId: string,
  payload: any,
) => {
  const [existingProvider, existingSubCategory, existingUser] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.providerId, role: "PROVIDER" },
      }),
      prisma.subCategory.findUnique({
        where: { id: payload.subCatId },
      }),
      prisma.user.findUnique({
        where: { id: userId },
      }),
    ]);

  if (!existingProvider) {
    throw new ApiError(404, "Provider not found");
  }

  if (!existingSubCategory) {
    throw new ApiError(404, "Service not found");
  }

  if (!existingUser) {
    throw new ApiError(400, "User not found");
  }

  const existingService = await prisma.service.findFirst({
    where: { subCatId: existingSubCategory.id, providerId: payload.providerId },
  });

  if (!existingService) {
    throw new ApiError(400, "Service not found");
  }

  const baseFee = existingService.fee;

  const percentage = existingUser.isSubscribed
    ? existingSubCategory.hodsCharge
    : existingSubCategory.charge;

  const minimumCharge = existingUser.isSubscribed
    ? existingSubCategory.hodsCharge
    : existingSubCategory.charge;

  // calculate percentage-based charge
  const percentageCharge = (baseFee * percentage) / 100;

  // final charge (enforce minimum)
  const charge = Math.max(percentageCharge, minimumCharge);

  const totalFee = baseFee + charge;

  const applicationContext: any = {
    return_url: "http://72.60.125.50:5003/payment-status/success",
    cancel_url: "http://72.60.125.50:5003/payment-status/cancel",
  };

  // Disable BNPL if total < 120
  if (totalFee < 120) {
    applicationContext.payment_method = { pay_later: "DISABLED" };
    applicationContext.payment_method = { payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED" };
  }

   const token = await getAccessToken();

  const orderRes = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: totalFee.toFixed(2),
          },
        },
      ],
      application_context: applicationContext,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const approvalLink = orderRes.data.links.find(
    (link: any) => link.rel === "approve",
  )?.href;

  if (!approvalLink) {
    throw new Error(
      "Approval URL not generated. Payment creation may have failed.",
    );
  }

  const booking = await prisma.booking.create({
    data: {
      customerId: userId,
      providerId: payload.providerId,
      subCatId: payload.subCatId,
      charge,
      serviceId: existingService.id,
      fee: existingService.fee,
      date: payload.date,
      time: payload.time,
      totalFee: totalFee,
      requirement: payload.requirement,
      isPaymentConfirmed: false,
      paypalOrderId: orderRes.data.id,
    },
  });
  return {
    booking,
    approvalLink,
  };
};

const captureOrder = async (orderId: string) => {
  const token = await getAccessToken();

  const captureRes = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const findBooking = await prisma.booking.findFirst({
    where: { paypalOrderId: orderId },
  });

  if (!findBooking) {
    throw new ApiError(404, "Booking not found");
  }

  const captureId = captureRes.data.purchase_units[0].payments.captures[0].id;

  if (captureRes) {
    await prisma.booking.update({
      where: { id: findBooking?.id },
      data: {
        isPaymentConfirmed: true,
        paypalOrderId: captureId,
      },
    });

    try {
      await sendSingleNotification(
        findBooking?.providerId,
        `You have got a new booking, Check your schedule`,
        findBooking?.customerId,
        "New Booking!",
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
  }

  return;
};

const getUserBookingsFromDb = async (userId: string) => {
  // Verify the user
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  // Get all bookings + provider services
  const bookings = await prisma.booking.findMany({
    where: { customerId: userId, isPaymentConfirmed: true },
    select: {
      id: true,
      date: true,
      fee: true,
      totalFee: true,
      time: true,
      tip: true,
      cancelReason: true,
      requested: true,
      requirement: true,
      status: true,
      subCatId: true,
      charge: true,
      reviewedByUser: true,
      subCategory: {
        select: {
          id: true,
          mediaUrl: true,
          subCatName: true,
          charge: true,
          hodsCharge: true,
        },
      },

      provider: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
          Service: {
            select: {
              id: true,
              mediaUrl: true,
              title: true,
              address: true,
              subCatId: true, // must select this for filtering
            },
          },
        },
      },
    },
  });

  // Filter to only the matching service
  const finalResult = bookings.map((booking) => ({
    ...booking,
    provider: {
      ...booking.provider,
      Service: booking.provider.Service.filter(
        (s) => s.subCatId === booking.subCatId,
      ),
    },
  }));

  return finalResult;
};

const getProviderBookingsFromDb = async (providerId: string) => {
  // Validate provider
  await prisma.user.findUniqueOrThrow({
    where: { id: providerId, role: "PROVIDER" },
  });

  // Fetch bookings with provider services
  const bookings = await prisma.booking.findMany({
    where: { providerId, isPaymentConfirmed: true },
    include: {
      subCategory: {
        select: {
          id: true,
          mediaUrl: true,
          subCatName: true,
        },
      },
      provider: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
          Service: {
            select: {
              id: true,
              mediaUrl: true,
              title: true,
              address: true,
              subCatId: true, // MUST include for filtering
            },
          },
        },
      },
    },
  });

  // Attach only the service matching the booking’s subCatId
  const finalResult = bookings.map((booking) => ({
    ...booking,
    provider: {
      ...booking.provider,
      Service: booking.provider.Service.filter(
        (s) => s.subCatId === booking.subCatId,
      ),
    },
  }));

  return finalResult;
};

const getBookingDetailsFromDB = async (userId: string, bookingId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true },
  });

  const isUser = user.role === "USER";

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      totalFee: true,
      fee: true,
      date: true,
      time: true,
      status: true,
      requested: true,
      charge: true,
      cancelReason: true,
      requirement: true,
      subCategory: {
        select: {
          id: true,
          subCatName: true,
          mediaUrl: true,
          avgRating: true,
          totalReview: true,
          hodsCharge: true,
          charge: true,
        },
      },
      service: {
        select: {
          title: true,
          mediaUrl: true,
          address: true,
          id: true,
        },
      },
      ...(isUser
        ? {
            provider: {
              select: {
                id: true,
                userName: true,
                phone: true,
                email: true,
                profileImage: true,
                restrictedByUsers: {
                  where: {
                    userId,
                  },
                  select: {
                    id: true,
                  },
                },
              },
            },
          }
        : {
            customer: {
              select: {
                id: true,
                userName: true,
                phone: true,
                email: true,
                address: true,
                profileImage: true,
                idBack: true,
                idFront: true,
              },
            },
          }),
    },
  });

  return booking;
};

const updateBookingStatusToActive = async (bookingId: string) => {
  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (existingBooking?.status !== "PENDING") {
    throw new ApiError(400, "Booking cannot be accepted at this stage");
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "ACTIVE" },
  });

  try {
    await sendSingleNotification(
      existingBooking.customerId,
      "Your booking is now active — your provider has confirmed the appointment.📅",
      existingBooking.providerId,
      "Booking Activated",
    );
  } catch (notificationError) {
    console.error("Notification failed:", notificationError);
  }
  return updatedBooking;
};
// const updateBookingStatusToCancelled = async (
//   bookingId: string,
//   id: string,
//   reason: string
// ) => {
//   const [existingUser, existingBooking] = await Promise.all([
//     prisma.user.findUnique({
//       where: { id },
//     }),
//     prisma.booking.findUnique({
//       where: { id: bookingId },
//     }),
//   ]);
//   if (!existingBooking || !existingBooking.paymentIntentId) {
//     throw new ApiError(404, "Booking not found");
//   }
//   if (!existingUser) {
//     throw new ApiError(404, "User not found");
//   }

//   const isCancellable =
//     existingBooking.status === "PENDING" ||
//     (existingBooking.status === "ACTIVE");

//   if (!isCancellable) {
//     throw new ApiError(400, "Booking can't be cancelled at this stage");
//   }

//   const response = await refundPayment(existingBooking.paypalOrderId as string)

//   const res = await stripe.refunds.create({
//     payment_intent: existingBooking.paymentIntentId,
//     amount: Math.floor(existingBooking.totalFee * 100),
//   });
//   if (res.status == "succeeded") {
//     const updatedBooking = await prisma.booking.update({
//       where: { id: bookingId },
//       data: {
//         status: "CANCELLED",
//         cancelReason: reason,
//       },
//     });
//     return updatedBooking;
//   } else {
//     return "Something went wrong, cancellation failed";
//   }
// };
const updateBookingStatusToCancelled = async (
  bookingId: string,
  userId: string,
  reason: string,
) => {
  const [user, booking] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.booking.findUnique({ where: { id: bookingId } }),
  ]);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (!user) throw new ApiError(404, "User not found");

  const isCancellable =
    booking.status === "PENDING" || booking.status === "ACTIVE";

  if (!isCancellable) {
    throw new ApiError(400, "Booking can't be cancelled at this stage");
  }

  const paidWithStripe = !!booking.paymentIntentId;
  const paidWithPaypal = !!booking.paypalOrderId;

  if (!paidWithStripe && !paidWithPaypal) {
    throw new ApiError(400, "No payment information found");
  }

  let refundSuccess = false;

  if (paidWithStripe) {
    if (!booking.paymentIntentId) {
      throw new ApiError(400, "Stripe paymentIntentId missing");
    }
    const refund = await stripe.refunds.create({
      payment_intent: booking.paymentIntentId,
      amount: Math.floor(booking.totalFee * 100),
    });

    refundSuccess = refund?.status === "succeeded";
  }

  if (paidWithPaypal) {
    const refund = await refundPayment(booking.paypalOrderId as string);
    console.log(refund);
    refundSuccess = refund?.status === "COMPLETED";
  }

  if (!refundSuccess) {
    throw new ApiError(500, "Refund failed");
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelReason: reason,
    },
  });
};

const updateBookingStatusToCompletedd = async (
  bookingId: string,
  id: string,
) => {
  const [existingUser, existingBooking] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
    }),
    prisma.booking.findUnique({
      where: { id: bookingId },
    }),
  ]);
  if (!existingBooking) {
    throw new ApiError(404, "Booking not found");
  }
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }
  const provider = await prisma.user.findUnique({
    where: { id: existingBooking.providerId },
  });
  if (!provider) {
    throw new ApiError(404, "Provider not found");
  }
  if (existingBooking.status !== "ACTIVE" || existingBooking.isPaymentShared) {
    throw new ApiError(
      400,
      "Transfer not allowed: Booking must be ACTIVE and not yet shared",
    );
  }

  const transferableAmount = existingBooking.totalFee - existingBooking.charge;

  const transfer = await stripe.transfers.create({
    amount: Math.round(transferableAmount * 100),
    currency: "usd",
    destination: provider.stripeCustomerId,
    // transfer_group: `booking_abc123`,
  });
  if (!transfer.reversed) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { isPaymentShared: true, status: "COMPLETED" },
    });
    try {
      await sendSingleNotification(
        existingBooking.customerId,
        `Booking marked as Completed by the service provider`,
        existingBooking.providerId,
        "Booking Update!",
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
  } else {
    throw new ApiError(400, "Booking cannot be completed at this stage");
  }
};

const confirmPaymentThroughStripe = async (
  bookingId: string,
  paymentMethodId: string,
) => {
  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (!existingBooking) {
    throw new ApiError(404, "Booking not found");
  }
  const user = await prisma.user.findUnique({
    where: { id: existingBooking.customerId, role: "USER" },
  });
  const provider = await prisma.user.findUnique({
    where: { id: existingBooking.providerId, role: "PROVIDER" },
  });
  const totalAmount = Math.round(existingBooking.fee * 100);
  const platformFee = Math.round(totalAmount * 0.15);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: "usd",
    customer: user?.stripeCustomerId,
    confirm: true,
    payment_method: paymentMethodId as string,

    application_fee_amount: platformFee,
    transfer_data: {
      destination: provider?.stripeCustomerId as string,
    },

    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });

  if ((paymentIntent.status = "succeeded")) {
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED" },
    });
    return updatedBooking;
  } else {
    return "Booking Failed";
  }
};

const getAllBookingsFromDb = async () => {
  const bookings = await prisma.booking.findMany({
    where: { isPaymentConfirmed: true },
    select: {
      id: true,
      date: true,
      fee: true,
      time: true,
      cancelReason: true,
      requirement: true,
      status: true,
      isPaymentShared: true,
      totalFee: true,
      subCategory: {
        select: {
          id: true,
          mediaUrl: true,
          subCatName: true,
        },
      },
      provider: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
          stripeCustomerId: true,
        },
      },
    },
  });

  // if (bookings.length < 1) {
  //   throw new ApiError(404, "You don't have any booking yet");
  // }
  return bookings;
};

const shareProvidersTheirPayment = async (bookingId: string) => {
  const existingBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });
  if (existingBooking?.status !== "COMPLETED") {
    throw new ApiError(404, "Booking not completed yet");
  }
  if (existingBooking.isPaymentShared) {
    throw new ApiError(404, "Already transferred");
  }
  const provider = await prisma.user.findUnique({
    where: { id: existingBooking.providerId },
  });
  if (!provider) {
    throw new ApiError(404, "Provider not found");
  }

  const transfer = await stripe.transfers.create({
    amount: existingBooking.fee * 90,
    currency: "usd",
    destination: provider.stripeCustomerId,
    // transfer_group: `booking_abc123`,
  });
  if (!transfer.reversed) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { isPaymentShared: true },
    });
  }

  return transfer;
};

const getProvdiderEarningsFromDB = async (providerId: string) => {
  await prisma.user.findFirstOrThrow({
    where: { id: providerId, role: "PROVIDER" },
  });

  const bookings = await prisma.booking.findMany({
    where: { providerId, status: "COMPLETED" },
    select: {
      totalFee: true,
      createdAt: true,
    },
  });

  if (!bookings || bookings.length === 0) {
    throw new ApiError(404, "You have no earnings");
  }

  const monthlyEarnings: Record<string, number> = {};
  let totalEarnings = 0;

  bookings.forEach((booking) => {
    const fee = (booking.totalFee ?? 0) * 0.9;
    const roundedFee = Math.round(fee);
    const monthName = format(new Date(booking.createdAt), "MMMM");

    monthlyEarnings[monthName] = Math.round(
      (monthlyEarnings[monthName] || 0) + roundedFee,
    );

    totalEarnings += roundedFee;
  });

  totalEarnings = Math.round(totalEarnings);

  return {
    totalEarnings,
    monthlyEarnings,
  };
};

const requestUpdatePriceIntoDB = async (payload: any) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId },
  });
  const existingSubCategory = await prisma.subCategory.findUniqueOrThrow({
    where: { id: booking.subCatId },
  });

  const existingUser = await prisma.user.findUniqueOrThrow({
    where: { id: booking.customerId },
  });

  if (booking.totalFee > payload.requestAmount) {
    throw new ApiError(400, "Updated fee can't be less than current fee");
  }

  let requestedCharge = 0;

  const baseFee = payload.requestAmount - booking.totalFee;
  const percentage = existingUser.isSubscribed
    ? existingSubCategory.hodsCharge
    : existingSubCategory.charge;

  requestedCharge = baseFee * (percentage / 100);

  const rc = Math.floor(requestedCharge);

  await prisma.booking.update({
    where: { id: payload.bookingId },
    data: {
      requested: payload.requestAmount + rc,
      requestedCharge: rc,
    },
  });
  try {
    await sendSingleNotification(
      booking.customerId,
      `The provider has submitted a request to revise your booking price to ${
        payload.requestAmount
      }. With Fees & taxes total vaule is now ${
        payload.requestAmount + requestedCharge
      } 💰`,
      booking.providerId,
      "New Price Adjustment Request!",
    );
  } catch (notificationError) {
    console.error("Notification failed:", notificationError);
  }
  return;
};

const rejectPriceUpdateRequest = async (bookingId: string) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { requested: 0, requestedCharge: 0 },
  });

  try {
    await sendSingleNotification(
      booking.providerId,
      `The customer has declined your price update request. 💰`,
      booking.customerId,
      "Price Update Request Declined",
    );
  } catch (notificationError) {
    console.error("Notification failed:", notificationError);
  }
  return;
};

const acceptPriceUpdateIntoDB = async (payload: any) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: booking.customerId },
  });

  await stripe.paymentMethods.attach(payload.paymentMethodId as string, {
    customer: user?.stripeCustomerId as string,
  });

  const amount = booking.requested - booking.totalFee;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    customer: user?.stripeCustomerId,
    confirm: true,
    payment_method: payload.paymentMethodId as string,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });

  if (paymentIntent.status === "succeeded") {
    await prisma.booking.update({
      where: { id: payload.bookingId },
      data: {
        totalFee: booking.requested,
        requested: 0,
        charge: booking.charge + booking.requestedCharge,
        requestedCharge: 0,
      },
    });
    try {
      await sendSingleNotification(
        booking.providerId,
        `Great news! The customer accepted your updated price of $${booking.requested}. 🎉`,
        user.id,
        "Price Update Approved",
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
    return;
  } else {
    throw new ApiError(400, "Payment failed");
  }
};

const acceptPriceUpdateThroughPaypalIntoDB = async (bookingId: any) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });

  await prisma.user.findUniqueOrThrow({
    where: { id: booking.customerId },
  });

  const token = await getAccessToken();

  const amount = booking.requested - booking.totalFee;

  const orderRes = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: booking.id,
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: "http://72.60.125.50:5003/payment-status/success",
        cancel_url: "http://72.60.125.50:5003/payment-status/cancel",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const approvalLink = orderRes.data.links.find(
    (link: any) => link.rel === "approve",
  )?.href;

  if (!approvalLink) {
    throw new Error(
      "Approval URL not generated. Payment creation may have failed.",
    );
  }
  return approvalLink;
};

const verifyAcceptPriceUpdate = async (bookingId: string) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      totalFee: booking.requested,
      requested: 0,
      charge: booking.charge + booking.requestedCharge,
      requestedCharge: 0,
    },
  });
  try {
    await sendSingleNotification(
      booking.providerId,
      `Great news! The customer accepted your updated price of $${booking.requested}. 🎉`,
      booking.customerId,
      "Price Update Approved",
    );
  } catch (notificationError) {
    console.error("Notification failed:", notificationError);
  }
};

const getSummaryFromDB = async () => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const SAUDI_OFFSET_HOURS = 3;

  const monthEarnings = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
    },
    select: { totalFee: true, createdAt: true },
  });

  const monthlyData = Array(12).fill(0);

  for (const e of monthEarnings) {
    const localDate = new Date(
      e.createdAt.getTime() + SAUDI_OFFSET_HOURS * 60 * 60 * 1000,
    );
    const index = getMonth(localDate);
    monthlyData[index] += e.totalFee;
  }

  const chartData = months.map((month, idx) => ({
    month,
    earnings: monthlyData[idx],
  }));

  return {
    chartData,
  };
};

export default getProvdiderEarningsFromDB;

export const bookingServices = {
  createBookingIntoDB,
  getUserBookingsFromDb,
  getProviderBookingsFromDb,
  verifyAcceptPriceUpdate,
  shareProvidersTheirPayment,
  requestUpdatePriceIntoDB,
  updateBookingStatusToActive,
  acceptPriceUpdateIntoDB,
  updateBookingStatusToCancelled,
  acceptPriceUpdateThroughPaypalIntoDB,
  rejectPriceUpdateRequest,
  confirmPaymentThroughStripe,
  getSummaryFromDB,
  updateBookingStatusToCompletedd,
  createBookingThroughtPaypalIntoDB,
  getBookingDetailsFromDB,
  captureOrder,
  getAllBookingsFromDb,
  getProvdiderEarningsFromDB,
};
