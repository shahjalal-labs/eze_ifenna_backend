import Stripe from "stripe";
import ApiError from "../../../errors/ApiErrors";
import { Request } from "express";

import config from "../../../config";
import prisma from "../../../shared/prisma";
import { SubscriptionType } from "@prisma/client";
const stripe = new Stripe(config.stripe.stripe_secret as string);

const createMonthlySubscriptionPlan = async () => {
  const title = "Monthly Subscription";
  const subscriptionTitleType = "MONTHLY";
  const amount = 5.99;
  const interval = "month";
  const features = ["Will get 5% less in booking"];

  const existing = await prisma.subscription.findUnique({
    where: { subscriptionTitleType },
  });

  if (existing) {
    console.log("Subscription already exists");
    return;
  }

  const product = await stripe.products.create({ name: title });
  if (!product) throw new ApiError(400, "Product creation failed");

  const price = await stripe.prices.create({
    unit_amount: amount * 100,
    currency: "usd",
    recurring: { interval },
    product: product.id,
  });

  const result = await prisma.subscription.create({
    data: {
      title,
      subscriptionTitleType,
      priceId: price.id,
      productId: product.id,
      features,
      type: SubscriptionType.SUBSCRIPTION,
      interval,
    },
  });

  console.log(" Monthly subscription created successfully.");

  return result;
};

const getAllSubscriptionPlanIntoDB = async () => {
  const products = await prisma.subscription.findMany({
    select: {
      id: true,
      title: true,
      priceId: true,
      features: true,
    },
  });

  const plansWithPrice = await Promise.all(
    products.map(async (product) => {
      try {
        const price = await stripe.prices.retrieve(product.priceId);
        return {
          ...product,
          price: price.unit_amount ? price.unit_amount / 100 : null,
        };
      } catch (error) {
        console.error(
          `Failed to fetch Stripe price for ID ${product.priceId}:`,
          error
        );
        return {
          ...product,
          price: null,
        };
      }
    })
  );

  return plansWithPrice;
};

const createSubscriptionIntoDB = async (
  priceId: string,
  paymentMethodId: string,
  userId: string
) => {
  await prisma.userSubscription.findUnique({
    where: {
      userId_priceId: { userId, priceId },
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  if (user.isSubscribed == true) {
    throw new ApiError(400, "You are already subscribed");
  }

  // if (existingSubscription) {
  //   throw new ApiError(
  //     400,
  //     "User already has an active subscription for this plan."
  //   );
  // }

  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: user.stripeCustomerId,
  });
  await stripe.customers.update(user.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const response = await stripe.subscriptions.create({
    customer: user.stripeCustomerId,
    items: [{ price: priceId }],
    // expand: ["latest_invoice.payment_intent"],
    metadata: {
      priceId,
      userId,
    },
  });
  console.log(response);

  if (response.status == "active") {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isSubscribed: true,
        subscriptionId: response.id,
      },
    });
    return;
  } else {
    throw new ApiError(400, "Subscription failed");
  }
};

const handleSubscriptionCreated = async (
  priceId: string,
  userId: string,
  subscriptionPayId: string
) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { priceId },
    });

    if (!subscription) {
      throw new ApiError(
        404,
        `Subscription with priceId: ${priceId} not found`
      );
    }
    const result = await prisma.userSubscription.upsert({
      where: { userId_priceId: { userId, priceId } },
      create: {
        features: subscription?.features || {},
        userId: userId,
        priceId: priceId,
        subscriptionId: subscription?.id,
        subscriptionTitleType: subscription?.subscriptionTitleType,
        subscriptionPayId: subscriptionPayId,
      },
      update: {
        status: "ACTIVE",
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { isSubscribed: true },
    });
    return result;
  } catch (error) {
    throw new ApiError(500, "Failed to create or update the subscription");
  }
};

const handleSubscriptionStatusUpdate = async (
  userId: string,
  priceId: string,
  status: "ACTIVE" | "DEACTIVE"
) => {
  try {
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId,
        priceId,
      },
    });

    if (!existingSubscription) {
      throw new ApiError(
        404,
        `No subscription found for user ${userId} with priceId ${priceId}`
      );
    }

    await prisma.userSubscription.update({
      where: {
        userId_priceId: { userId, priceId },
      },
      data: {
        status,
      },
    });
  } catch (error) {
    throw new ApiError(500, "Failed to update subscription status");
  }
};

const cancelSubscriptionFromDB = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  if (!user.subscriptionId) {
    throw new ApiError(404, "No subscription found");
  }
  const response = await stripe.subscriptions.cancel(user.subscriptionId);
  if (response.status == "canceled") {
    await prisma.user.update({
      where: { id: userId },
      data: { isSubscribed: false, subscriptionId: "" },
    });
    return;
  } else {
    throw new ApiError(400, "Subscription cancellation failed");
  }
  // const updatedSubscription = await prisma.userSubscription.updateMany({
  //   where: { userId, status: "ACTIVE" },
  //   data: { status: "DEACTIVE" },
  // });
};

export const stripeService = {
  createMonthlySubscriptionPlan,
  getAllSubscriptionPlanIntoDB,
  createSubscriptionIntoDB,
  handleSubscriptionCreated,
  handleSubscriptionStatusUpdate,
  cancelSubscriptionFromDB,
};
