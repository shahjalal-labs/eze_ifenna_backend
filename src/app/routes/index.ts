import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoute } from "../modules/auth/auth.routes";
import { categoryRoutes } from "../modules/category/category.route";
import { serviceRoutes } from "../modules/service/service.routes";
import { subCategoryRoutes } from "../modules/subCategory/subCategory.routes";
import { reviewRoute } from "../modules/review/review.routes";
import { bookingRoutes } from "../modules/booking/booking.route";
import { messageRoute } from "../modules/message/message.routes";
import { availabilityRoutes } from "../modules/availability/availability.route";
import { stripeRoutes } from "../modules/stripe/stripe.routes";
import { paypalRoutes } from "../modules/paypal/paypal.route";
import { notificationsRoute } from "../modules/notifications/notification.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/availability",
    route: availabilityRoutes,
  },
  {
    path: "/category",
    route: categoryRoutes,
  },
  {
    path: "/sub-category",
    route: subCategoryRoutes,
  },
  {
    path: "/service",
    route: serviceRoutes,
  },
  {
    path: "/review",
    route: reviewRoute,
  },
  {
    path: "/booking",
    route: bookingRoutes,
  },
  {
    path: "/message",
    route: messageRoute,
  },
  {
    path: "/stripe",
    route: stripeRoutes,
  },
  {
    path: "/paypal",
    route: paypalRoutes,
  },
  {
    path: "/notification",
    route: notificationsRoute,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
