
import httpStatus from 'http-status';
import { prisma } from '../../lib/prisma';
import type { IRequestUser } from '../../middleware/checkAuth';
import { AppError } from '../../utils/appError';
import type { ICreateSchedulePayload, IUpdateSchedulePayload } from './schedule.interface';
import { addDays, differenceInMinutes, isAfter, isSameDay, startOfDay } from 'date-fns';
import type { IQuery } from '../../interfaces';
import type { ScheduleWhereInput } from '../../../generated/prisma/models';
import { ScheduleStatus } from '../../../generated/prisma/enums';

// done
const createSchedule = async (payload: ICreateSchedulePayload, user: IRequestUser) => {
  const doctor = await prisma.doctor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!doctor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor profile not found');
  }

  if (!isSameDay(payload.startDateTime, payload.endDateTime)) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Start Date time and end date time must be on the same day.'
    );
  }

  if (isAfter(payload.startDateTime, payload.endDateTime)) {
    throw new AppError(httpStatus.CONFLICT, 'Start Date time cannot be after end date time.');
  }

  const startOfTheDay = startOfDay(payload.startDateTime); // 25 August => 12:00 AM
  const startNextDay = addDays(startOfTheDay, 1); // 26 Augest => 12:00 AM

  const existingScheduleOnThisDate = await prisma.schedule.findFirst({
    where: {
      doctorId: doctor.id,
      isDeleted: false,
      startDateTime: {
        gte: startOfTheDay,
        lt: startNextDay,
      },
    },
  });

  if (existingScheduleOnThisDate) {
    throw new AppError(httpStatus.CONFLICT, 'You alreay have a schedule for this date');
  }

  const durationInMinutes = differenceInMinutes(payload.endDateTime, payload.startDateTime);

  const MINUTES_ALLOCATED_PER_SLOT = 20;

  const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

  const schedule = await prisma.schedule.create({
    data: {
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      meetingLink: payload.meetingLink,
      totalSlots,
      availableSlots: totalSlots,
      doctorId: doctor.id,
    },
    include: {
      doctor: {
        select: {
          name: true,
          email: true,
          contactNumber: true,
        },
      },
    },
  });

  return schedule;
};

// done
const getMySchedules = async (query: IQuery, user: IRequestUser) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder ? query.sortOrder : 'desc';

  const doctor = await prisma.doctor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!doctor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor frofile not found');
  }

  const andConditions: ScheduleWhereInput[] = [
    {
      doctorId: doctor.id,
    },
    {
      isDeleted: false,
    },
  ];

  if (query.status) {
    andConditions.push({ status: query.status });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      appointments: {
        include: {
          patient: true,
        },
      },
    },
  });

  const total = await prisma.schedule.count({ where: { AND: andConditions } });

  return {
    data: schedules,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAllSchedules = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : 'createAt';
  const sortOrder = query.sortOrder ? query.sortOrder : 'desc';

  const andConditions: ScheduleWhereInput[] = [];

  if (query.doctorId) {
    andConditions.push({ doctorId: query.dooctorId });
  }

  if (query.email) {
    andConditions.push({
      doctor: {
        email: query.email,
      },
    });
  }

  if (query.status) {
    andConditions.push({ status: query.status });
  }

  // searching
  if (query.searchTerm) {
    andConditions.push({
      doctor: {
        OR: [
          {
            name: {
              contains: query.searchTerm,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query.searchTerm,
              mode: 'insensitive',
            },
          },
          {
            specialization: {
              contains: query.searchTerm,
              mode: 'insensitive',
            },
          },
          {
            licenseNumber: {
              contains: query.searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const total = await prisma.schedule.count({ where: { AND: andConditions } });

  return {
    data: schedules,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getScheduleById = async (scheduleId: string) => {
  const schedule = await prisma.schedule.findUnique({
    where: {
      id: scheduleId,
    },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          email: true,
          specialization: true,
          userId: true,
        },
      },
      appointments: {
        include: {
          patient: true,
        },
      },
    },
  });

  if (!schedule || schedule.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  return schedule;
};

const updateschedule = async (
  scheduleId: string,
  payload: IUpdateSchedulePayload,
  user: IRequestUser
) => {
  const doctor = await prisma.doctor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!doctor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor profile not found');
  }

  const schedule = await prisma.schedule.findUnique({
    where: {
      id: scheduleId,
      doctorId: doctor.id,
    },
  });

  if (!schedule || schedule.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  if (
    schedule.status === ScheduleStatus.PUBLISHED &&
    schedule.totalSlots !== schedule.availableSlots
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Schedule once publish and appointment booked cannot be updated'
    );
  }
  // if (schedule.doctorId !== doctor.id) {
  //   throw new AppError(httpStatus.FORBIDDEN, 'You are not allowed to this schedule');
  // }

  // const updateData: IUpdateSchedulePayload = {};

  // if (payload.meetingLink) {
  //   updateData.meetingLink = payload.meetingLink || schedule.meetingLink;
  // }

  payload.meetingLink = payload.meetingLink || schedule.meetingLink;
  payload.starDateTime = payload.starDateTime || schedule.startDateTime;
  payload.endDateTime = payload.endDateTime || schedule.endDateTime;

  if (!isSameDay(payload.starDateTime, payload.endDateTime)) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Start Date time and end date time must be on the same day.'
    );
  }

  if (isAfter(payload.starDateTime, payload.endDateTime)) {
    throw new AppError(httpStatus.CONFLICT, 'Start Date time cannot be after end date time.');
  }

  const startOfTheDay = startOfDay(payload.starDateTime); // 25 August => 12:00 AM
  const startNextDay = addDays(startOfTheDay, 1); // 26 Augest => 12:00 AM

  const existingScheduleOnThisDate = await prisma.schedule.findFirst({
    where: {
      doctorId: doctor.id,
      isDeleted: false,
      startDateTime: {
        gte: startOfTheDay,
        lt: startNextDay,
      },
    },
  });

  if (existingScheduleOnThisDate) {
    throw new AppError(httpStatus.CONFLICT, 'You alreay have a schedule for this date');
  }

  const durationInMinutes = differenceInMinutes(payload.starDateTime, payload.endDateTime);

  const MINUTES_ALLOCATED_PER_SLOT = 20;

  const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

  const Updatedschedule = await prisma.schedule.update({
    where: {
      id: schedule.id,
    },
    data: {
      startDateTime: payload.starDateTime,
      endDateTime: payload.endDateTime,
      meetingLink: payload.meetingLink,
      totalSlots,
      availableSlots: totalSlots,
      doctorId: doctor.id,
    },
    include: {
      doctor: {
        select: {
          name: true,
          email: true,
          contactNumber: true,
        },
      },
    },
  });

  return Updatedschedule;
};

// done
const publishedSchedule = async (scheduleId: string, user: IRequestUser) => {
  // console.log('Schedule Id form service line 373', scheduleId);
  const doctor = await prisma.doctor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!doctor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor profile not found');
  }

  const schedule = await prisma.schedule.findUnique({
    where: {
      id: scheduleId,
      doctorId: doctor.id,
    },
  });

  if (!schedule || schedule.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  if (schedule.status === ScheduleStatus.PUBLISHED) {
    throw new AppError(httpStatus.CONFLICT, 'Schedule is alredy published');
  }

  const publishedSchedule = await prisma.schedule.update({
    where: {
      id: schedule.id,
    },
    data: {
      status: ScheduleStatus.PUBLISHED,
    },
  });

  return publishedSchedule;
};

const deleteSchedule = async (scheduleId: string, user: IRequestUser) => {
  const doctor = await prisma.doctor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!doctor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor profile not found');
  }

  const schedule = await prisma.schedule.findUnique({
    where: {
      id: scheduleId,
      doctorId: doctor.id,
    },
  });

  if (!schedule || schedule.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  // if (schedule.status === ScheduleStatus.PUBLISHED) {
  //   throw new AppError(httpStatus.CONFLICT, 'Schedule is alredy published');
  // }

  if (
    schedule.status === ScheduleStatus.PUBLISHED &&
    schedule.totalSlots !== schedule.availableSlots
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Schedule once publish and appointment booked cannot be deleteted'
    );
  }

  const deletedSchedule = await prisma.schedule.update({
    where: {
      id: schedule.id,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return deletedSchedule;
};

const getTodaysSchedule = async (query: IQuery) => {
  if (!query.doctorId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor Id Must be provided in Query');
  }

  const doctor = await prisma.doctor.findUnique({
    where: {
      id: query.doctorId,
    },
  });

  if (!doctor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor profile not found');
  }

  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder ? query.sortOrder : 'desc';

  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfTomorrow = addDays(startOfToday, 1);

  const andConditions: ScheduleWhereInput[] = [
    {
      doctorId: query.doctorId,
    },
    {
      isDeleted: false,
    },
    {
      status: ScheduleStatus.PUBLISHED,
    },
    {
      startDateTime: {
        gte: startOfToday,
        lt: startOfTomorrow,
        gt: now,
      },
    },
    {
      availableSlots: { gt: 0 },
    },
  ];

  const schedules = await prisma.schedule.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const total = await prisma.schedule.count({ where: { AND: andConditions } });

  return {
    data: schedules,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const ScheduleService = {
  createSchedule,
  getMySchedules,
  getAllSchedules,
  getScheduleById,
  updateschedule,
  publishedSchedule,
  deleteSchedule,
  getTodaysSchedule,
};
