import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { ScheduleService } from './schedule.service';
import { sendResponse } from '../../utils/sendResponse';

// done
const createSchedule = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req?.user!;

  const result = await ScheduleService.createSchedule(payload, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule Create successfully',
    data: result,
  });
});

// done
const getMySchedules = catchAsync(async (req: Request, res: Response) => {
  const query = req.query;
  const user = req.user!;

  const result = await ScheduleService.getMySchedules(query, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Schedule retrived list view successfully',
    data: result,
  });
});

const getAllSchedules = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await ScheduleService.getAllSchedules(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
  });
});

const getTodaysSchedules = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await ScheduleService.getTodaysSchedule(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
  });
});

const getScheduleById = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await ScheduleService.getScheduleById(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
  });
});

const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await ScheduleService.updateschedule();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
  });
});

const publishedSchedule = catchAsync(async (req: Request, res: Response) => {
  const scheduleId = req.params.scheduleId as string;
  const user = req.user!;

  const result = await ScheduleService.publishedSchedule(scheduleId, user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
  });
});

const deteleSchedule = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user!;

  const result = await ScheduleService.deleteSchedule(payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Appointment Payment Initialize successfully',
    data: result,
  });
});

export const ScheduleController = {
  createSchedule,
  getMySchedules,
  getAllSchedules,
  getTodaysSchedules,
  getScheduleById,
  updateSchedule,
  publishedSchedule,
  deteleSchedule,
};
