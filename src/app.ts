import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import express, {
	type NextFunction,
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { redisClient } from "./app/lib/redis";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { UserRoute } from "./app/module/user/user.route";
import { getBkashIdToken } from "./app/lib/bkash";
import { AppointmentRoute } from "./app/module/appointment/appointment.route";
import { DoctorRoutes } from "./app/module/doctor/doctor.routes";
import {
	ScheduleRoute,
	ScheduleRoutes,
} from "./app/module/schedule/schedule.route";
import { PrescripitonRoutes } from "./app/module/prescription/prescription.route";
import { PaymentRoutes } from "./app/module/payment/payment.routes";
import { AnalyticsRoutes } from "./app/module/analytics/analytics.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoute);
app.use("/api/v1/appointment", AppointmentRoute);
app.use("/api/v1/doctor", DoctorRoutes);
app.use("/api/v1/schedule", ScheduleRoutes);
app.use("/api/v1/payment", PaymentRoutes);
app.use("/api/v1/prescription", PrescripitonRoutes);
app.use("/api/v1/analytics", AnalyticsRoutes);
app.post("/test", async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await getBkashIdToken();

		console.log(result, "Bkash ID Token");

		res.status(httpStatus.OK).json({
			success: true,
			data: result,
			// message: 'OTP send for forget password!',
		});
	} catch (error) {
		next(error);
	}
});

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
