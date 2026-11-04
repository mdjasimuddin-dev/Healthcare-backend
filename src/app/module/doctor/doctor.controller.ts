import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { IRequestUser } from '../../middleware/checkAuth';
import { sendResponse } from '../../utils/sendResponse';
import { DoctorServices } from './doctor.services';
import { applyDoctorRegistrationZodSchema } from './doctor.validation';

const applyAsDoctor = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const resume = files?.['resume'] ? files['resume'][0] : null;
  const additionalFiles = files?.['additionalFiles'];

  const zoodValidationResult = applyDoctorRegistrationZodSchema.safeParse(
    JSON.parse(req.body.data)
  );

  if (!zoodValidationResult.success) {
    throw new Error(zoodValidationResult.error.issues[0].message);
  }

  const payload = zoodValidationResult.data;

  // console.log(resume, additionalFiles, data);

  const result = await DoctorServices.applyAsDoctor(payload, resume, additionalFiles);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Applied As Doctor successfuly',
    data: result,
  });
});

export const DoctorController = {
  applyAsDoctor,
};
