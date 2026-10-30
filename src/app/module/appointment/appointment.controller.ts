import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { AppointmentService } from './appointment.services';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  const result = await AppointmentService.createAppointmentService();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Booking Successfully',
    data: result,
  });
});

const paymentCreateSucessfully = catchAsync(async (req: Request, res: Response) => {
  const { executeBkashPayment, redirectUrl } = await AppointmentService.bookAppointmentCallback(
    req.query
  );

  console.log('Execute Bkash Payment :', executeBkashPayment);

  res.redirect(redirectUrl);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Booking Successfully',
    data: executeBkashPayment,
  });
});

export const AppointmentController = { bookAppointment, paymentCreateSucessfully };
