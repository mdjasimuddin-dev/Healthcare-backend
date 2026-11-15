import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { IRequestUser } from '../../middleware/checkAuth';
import { sendResponse } from '../../utils/sendResponse';
import { DoctorServices } from './doctor.services';
import { applyDoctorRegistrationZodSchema } from './doctor.validation';

// done 
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

// done 
const verifyDoctorEmail = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  console.log('Data received form body', payload);

  const result = await DoctorServices.verifyDoctorEmail(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Email Verified successfuly',
    data: result,
  });
});


const approveDoctor = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  console.log('Data received form body', payload);

  const result = await DoctorServices.apporveDoctor(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Email Verified successfuly',
    data: result,
  });
});

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {
  // const payload = req.body;
  // const user = req.user!;

  // console.log('Data received form body', payload);

  const { data, meta } = await DoctorServices.getAllDoctors(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Get all doctor successfuly',
    data: data,
    meta: meta,
  });
});

const updateDoctorProfile = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await DoctorServices.updateDoctorProfile(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Doctor profile update successfuly',
    data: result,
  });
});

const getAllDoctorsListPublic = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;

  const result = await DoctorServices.getAllDoctorsListPublic(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All Doctor profile view successfuly',
    data: result,
  });
});

const getSingleDoctorProfilePublic = catchAsync(async (req: Request, res: Response) => {
  const doctorId = req.params.doctorId as string;

  const result = await DoctorServices.getSingleDoctorPublicProfile(doctorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Doctor profile find successfuly',
    data: result,
  });
});

// done
const getAvailableDoctorByTodaySchedule = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;

  const result = await DoctorServices.getAvailableDoctorByTodaySchedule(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Today Available Doctor list view',
    data: result,
  });
});

export const DoctorController = {
  applyAsDoctor,
  verifyDoctorEmail,
  approveDoctor,
  getAllDoctors,
  updateDoctorProfile,
  getAllDoctorsListPublic,
  getSingleDoctorProfilePublic,
  getAvailableDoctorByTodaySchedule,
};
