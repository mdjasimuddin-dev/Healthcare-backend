import httpStatus from 'http-status';
import { IQuery } from '../../interfaces';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { IRequestUser } from '../auth/auth.interface';
import { PaymentWhereInput } from '../../../generated/prisma/models';
import { Role } from '../../../generated/prisma/enums';

const getMyPayments = async (query: IQuery, user: IRequestUser) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder ? query.sortOrder : 'desc';

  const patient = await prisma.patient.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!patient) {
    throw new AppError(httpStatus.NOT_FOUND, 'Patient profile not found');
  }

  const andConditions: PaymentWhereInput[] = [
    {
      appointment: {
        patientId: patient.id,
      },
    },
  ];

  const payments = await prisma.payment.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      appointment: {
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
        },
      },
      schedule: true,
    },
  });

  const total = await prisma.payment.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: payments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAllPayments = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder ? query.sortOrder : 'desc';

  const andConditions: PaymentWhereInput[] = [];

  if (query.patientEmail) {
    andConditions.push({
      appointment: {
        patient: {
          email: query.email,
        },
      },
    });
  }

  const payments = await prisma.payment.findMany({
    where: {
      AND: andConditions,
    },

    take: limit,
    skip,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      appointment: {
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
        },
      },
      schedule: true,
    },
  });

  const total = await prisma.payment.count({
    where: {
      AND: andConditions,
    },
  });

  return {
    data: payments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSinglePayments = async (paymentId: string, user: IRequestUser) => {
  const payment = await prisma.payment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      appointment: {
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              userId: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
          schedule: true,
        },
      },
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Patient profile not found');
  }

  if (user.role === Role.PATIENT) {
    if (payment.appointment.patient.userId !== user.userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'Your are not allowed to view this appointment');
    }
  }

  return payment;
};

export const PaymentServices = {
  getMyPayments,
  getAllPayments,
  getSinglePayments,
};
