import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { AppointmentService } from './appointment.services';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await AppointmentService.createAppointmentService(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
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

const cancleAppointment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await AppointmentService.cancleAppointment(payload);

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
  cancleAppointment,
};
