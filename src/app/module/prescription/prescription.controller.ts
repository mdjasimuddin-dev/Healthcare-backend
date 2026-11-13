import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { PrescriptionServices } from './prescription.services';

const createPrescription = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await PrescriptionServices.createPrescription(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Prescription Create successfully',
    data: result,
  });
});

const getSinglePrescription = catchAsync(async (req: Request, res: Response) => {
  const appointmentId = req.params.appointmentId as string;
  const user = req.user!;

  const result = await PrescriptionServices.getSinglePrescription(appointmentId, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Single prescripiton get successfully',
    data: result,
  });
});

export const PrescriptionController = {
  createPrescription,
  getSinglePrescription,
};
