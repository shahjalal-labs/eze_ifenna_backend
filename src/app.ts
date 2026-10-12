import express, { Application, NextFunction, Request, Response } from "express";

import httpStatus from "http-status";
import cors from "cors";
import router from "./app/routes";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
import { PrismaClient } from "@prisma/client";
import path from "path";
import redisClient from "./helpers/redis";

import handlePayPalWebHook from "./helpers/paypal.webhook";
import { privacyPolicyDarElChimal } from "./app/routes/viewRoute";

const app: Application = express();
const prisma = new PrismaClient();

// Middleware setup
// prisma
//   .$connect()
//   .then(() => {
//     console.log("Database connected successfully!");
//   })
//   .catch((error) => {
//     console.error("Failed to connect to the database:", error);
//   });
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
    await redisClient.connect();
  } catch (error) {
    console.error("Failed to connect to services:", error);
    process.exit(1); // exit app if connection fails
  }
})();

app.use(cors());

//webhooks

app.use("/webhook/paypal", express.json({ type: "*/*" }), handlePayPalWebHook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req: Request, res: Response) => {
  res.send({
    Message: "Welcome to api main route",
  });
});

app.use("/api/v1", router);

app.get("/payment-status/success", (req, res) => {
  const { token } = req.query;

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Successful</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 100px;
          }
          .success {
            color: green;
          }
          h1 {
            margin-bottom: 10px;
          }
          p {
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✅</h1>
          <h1>Your payment has been received</h1>
          <p>Thank you for your payment! Your booking has been confirmed.</p>
          <p>Stay tuned for further updates.</p>
        </div>

      <script>
  // Fire the capture-payment API using POST with orderId in URL
  fetch('http://72.60.125.50:5003/api/v1/booking/capture-payment/${token}', {
    method: 'POST'
  })
  .then(res => res.json())
  .then(data => console.log("Capture result:", data))
  .catch(err => console.error("Capture error:", err));
</script>
      </body>
    </html>
  `);
});
app.get("/account/connect/success", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Stripe Connection Successful</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 100px;
          }
          .success {
            color: green;
          }
          h1 {
            margin-bottom: 10px;
          }
          p {
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>✅</h1>
          <h1>Your Stripe account is connected!</h1>
          <p>You're all set to receive payments through our platform.</p>
          <p>Thank you for completing the setup.</p>
        </div>
      </body>
    </html>
  `);
});

app.get("/payment-status/cancel", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Cancelled</title>
        
      <body>       
          your payment is cancelled 
 
      </body>
    </html>
  `);
});

app.get("/privacy-policy", (req, res) => {
  res.send(privacyPolicyDarElChimal());
});

app.use(GlobalErrorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;
