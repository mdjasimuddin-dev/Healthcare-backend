import httpStatus from "http-status";
import type { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AnalyticsServices } from "./analytics.services";

const getAdminAnalytics = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user!;

	const result = await AnalyticsServices.getAdminAnalytics();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Prescription Create successfully",
		data: result,
	});
});

const getPatientAnalytics = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await AnalyticsServices.getPatientAnalytics(user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Single prescripiton get successfully",
		data: result,
	});
});

const getDoctorAnalytics = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await AnalyticsServices.getDoctorAnalytics(user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Single prescripiton get successfully",
		data: result,
	});
});

export const AnalyticsController = {
	getAdminAnalytics,
	getPatientAnalytics,
	getDoctorAnalytics,
};
