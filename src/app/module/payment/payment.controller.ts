import httpStatus from 'http-status';
import type { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { PaymentServices } from './payment.services';

const getMyPayment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await PaymentServices.getMyPayments(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment find Response successfully',
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;

  const result = await PaymentServices.getAllPayments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
  });
});

const getSinglePayments = catchAsync(async (req: Request, res: Response) => {
  const paymentId = req.params.paymentId as string;
  const user = req.user!;

  const result = await PaymentServices.getSinglePayments(paymentId, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Single payment get Successfully',
    data: result,
  });
});

export const PaymentController = {
  getMyPayment,
  getAllPayments,
  getSinglePayments,
};
