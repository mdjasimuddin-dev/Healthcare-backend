import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { AppointmentService } from './appointment.services';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';

// done
const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await AppointmentService.bookAppointment(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result.paymentUrl,
  });
});

const payAppointment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await AppointmentService.payAppointment(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
  });
});

const bookAppointmentCallback = catchAsync(async (req: Request, res: Response) => {
  const { redirectUrl } = await AppointmentService.bookAppointmentCallback(req.query);

  res.redirect(redirectUrl);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Booking Successfully',
    data: redirectUrl,
  });
});

const canceleAppointments = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await AppointmentService.cancleAppointment(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment payment refund successfully',
    data: result,
  });
});

const updateAppointmentStatus = catchAsync(async (req: Request, res: Response) => {
  const appointmentId = req.params.appointmentId as string;
  const payload = req.body;
  const user = req.user!;

  const result = await AppointmentService.updateAppointmentStatus(appointmentId, payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment payment refund successfully',
    data: result,
  });
});

const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const user = req.user!;

  const result = await AppointmentService.getMyAppointments(query, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment payment refund successfully',
    data: result,
  });
});

const getDoctorAppointments = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const user = req.user!;

  const result = await AppointmentService.getDoctorAppointments(query, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment payment refund successfully',
    data: result,
  });
});

const getAllAppointments = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const user = req.user!;

  const result = await AppointmentService.getAllAppointments(query, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment payment refund successfully',
    data: result,
  });
});

const getSingleAppointment = catchAsync(async (req: Request, res: Response) => {
  const appointmentId = req.params.appointmentId as string;
  const user = req.user!;

  const result = await AppointmentService.getSingleAppointment(appointmentId, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment payment refund successfully',
    data: result,
  });
});

export const AppointmentController = {
  bookAppointment,
  payAppointment,
  bookAppointmentCallback,
  canceleAppointments,
  updateAppointmentStatus,
  getMyAppointments,
  getDoctorAppointments,
  getAllAppointments,
  getSingleAppointment,
};
