import axios from "axios";
import dotenv from "dotenv";
import prisma from "../../../shared/prisma";

dotenv.config();

const PAYPAL_API = "https://api-m.sandbox.paypal.com";

export async function getAccessToken() {
  const base64 = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${base64}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data.access_token;
}

const createPayment = async (amount: number) => {
  const token = await getAccessToken();

  const orderRes = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount.toFixed(2),
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

  // await prisma.service.update({
  //   where: { id: serviceId },
  //   data: { paymentId: orderRes.data.id },
  // });

  return {
    orderId: orderRes.data.id,
    approvalUrl: approvalLink,
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
    }
  );

  const findBooking = await prisma.booking.findFirst({
    where: { paypalOrderId: orderId },
  });

  if (captureRes) {
    await prisma.booking.update({
      where: { id: findBooking?.id , paypalOrderId: captureRes.data.id},
      data: {
        isPaymentConfirmed: true,
      },
    });
  }

  return;
};

const getMyPaidInvoice = async (userId: string) => {
  const result = await prisma.service.findMany({
    // where: {
    //   userId: userId,
    //   isPaid: true,
    // },
    // select: {
    //   id: true,
    //   paymentId: true,
    //   amount: true,
    // },
  });
  return result;
};

const getMyUnpaidInvoice = async (userId: string) => {
  const result = await prisma.service.findMany({
    // where: {
    //   userId: userId,
    //   isPaid: false,
    // },
    // select: {
    //   id: true,
    //   amount: true,
    // },
  });
  return result;
};


export async function refundPayment(paypalPaymentId: string, amount?: number) {
  console.log(paypalPaymentId,"came here");
  try {
    const token = await getAccessToken();
    const url = `${PAYPAL_API}/v2/payments/captures/${paypalPaymentId}/refund`;

    const body: any = {};
    if (amount) {
      body.amount = {
        value: amount.toFixed(2),
        currency_code: "USD",
      };
    }

    const res = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return res.data;
  } catch (err: any) {
    console.error("PayPal Refund Error:", err?.response?.data || err.message);
    throw new Error("Refund failed. Check PayPal logs for more details.");
  }
}


export const PaymentService = {
  createPayment,
  captureOrder,
  getMyPaidInvoice,
  getMyUnpaidInvoice,
};
