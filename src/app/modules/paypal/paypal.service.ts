import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";

// paypal.js – PayPal helper
const axios = require("axios");
const base = "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const clientId =
    "AWxeiAckzBTTz_mutdhNKfBaUUCxDob00--HProDSMcTmITLvcAlM9PIFZBProgUm_2ZF5cVWMn0dOGk";
  const secret =
    "EDe5b_rqtWXVtpTgdzmRg0pm7Q6b9IVDkB9ZaHyXhqsSgNy7w3LAKJ5aoSui6lbqH3-wbKJUPWltybDt";
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const url = `${base}/v1/oauth2/token`;

  const { data } = await axios({
    url,
    method: "post",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: "grant_type=client_credentials",
  });
  return data.access_token;
}

const createProductAndPlan = async () => {
  const paypalPlan = await prisma.paypalSubscription.findFirst();

  if (paypalPlan) {
    console.log("Paypal plan already exists");
    return;
  }
  const token = await getAccessToken();

  const productRes = await axios.post(
    `${base}/v1/catalogs/products`,
    {
      name: "HUDS Monthly Subscripton",
      description: "Monthly HUDS subscripton for users",
      type: "SERVICE",
      category: "SOFTWARE",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const productId = productRes.data.id;

  const planRes = await axios.post(
    `${base}/v1/billing/plans`,
    {
      product_id: productId,
      name: "Basic Monthly Subscription",
      description: "Access to premium features",
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: "5.99",
              currency_code: "USD",
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: "0", currency_code: "USD" },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
      taxes: { percentage: "0", inclusive: false },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  await prisma.paypalSubscription.create({
    data: {
      planId: planRes.data.id,
    },
  });

  return {
    planId: planRes.data.id,
  };
};

const createSubscription = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id, role: "USER" },
  });
  if (user.isSubscribed) {
    throw new ApiError(400, "You already have a active subscription");
  }
  const plan = await prisma.paypalSubscription.findFirst();
  if (!plan) {
    throw new ApiError(404, "No paypal plans found");
  }
  const token = await getAccessToken();
  const url = `${base}/v1/billing/subscriptions`;

  const body = {
    plan_id: plan.planId,
    subscriber: {
      name: {
        given_name: user.userName,
        surname: "",
      },
      email_address: user.email,
    },
    application_context: {
      brand_name: "HODS",
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      payment_method: {
        payer_selected: "PAYPAL",
        payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
      },
      return_url: "http://localhost:5000/paypal/success",
      cancel_url: "http://localhost:5000/paypal/cancel",
    },
  };

  const { data } = await axios({
    url,
    method: "post",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: body,
  });
  console.log(data);

  const approvalLink = data.links.find((l: any) => l.rel === "approve").href;

  if (approvalLink) {
    await prisma.user.update({
      where: { id },
      data: {
        isSubscribed: true,
        paypalSubscriptionId: data.id,
      },
    });
    return approvalLink;
  } else {
    throw new ApiError(400, "Payment url not generated subscription failed");
  }
};

const handleSubscriptionApproval = () => {};

async function getSubscription(subscriptionId: string) {
  const token = await getAccessToken();
  const url = `${base}/v1/billing/subscriptions/${subscriptionId}`;
  const { data } = await axios({
    url,
    method: "get",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return data;
}

const cancelSubscription = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
  });

  if (!user.paypalSubscriptionId) {
    throw new ApiError(400, "You don't have a paypal subscripton");
  }

  const token = await getAccessToken();
  const url = `${base}/v1/billing/subscriptions/${user.paypalSubscriptionId}/cancel`;
  await axios({
    url,
    method: "post",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      reason: "User requested cancellation",
    },
  });
};

export const paypalServices = {
  createSubscription,
  createProductAndPlan,
  cancelSubscription,
};
