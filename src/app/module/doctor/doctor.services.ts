import httpStatus from 'http-status';
import { prisma } from '../../lib/prisma';
import type { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../../lib/cloudinary';
import { DoctorVerificationStatus, Role, ScheduleStatus } from '../../../generated/prisma/enums';
import bcrypt from 'bcryptjs';
import config from '../../config';
import crypto from 'crypto';
import { redisClient } from '../../lib/redis';
import path from 'node:path';
import ejs from 'ejs';
import { transporter } from '../../lib/nodemailer';
import type {
  IApplyAsDoctorPayload,
  IApproveDoctorPayload,
  IUpdateDoctorProfilePayload,
  IVerifyDoctorEmailPayload,
} from './doctor.interface';
import type { IRequestUser } from '../../middleware/checkAuth';
import type { IQuery } from '../../interfaces';
import type { DoctorWhereInput } from '../../../generated/prisma/models';
import { AppError } from '../../utils/appError';
import { addDays, startOfDay } from 'date-fns';

// done
const applyAsDoctor = async (
  payload: IApplyAsDoctorPayload,
  resume: Express.Multer.File | null,
  additionalFiles: Express.Multer.File[]
) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: payload.user.email.trim().toLowerCase(),
    },
  });

  if (isUserExists) {
    throw new Error('User already exits with this email');
  }

  const cloudinaryResumeUploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ resource_type: 'auto' }, async (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          throw new Error('No result returned from cloudinary');
        }

        resolve(result);
      })
      .end(resume?.buffer);
  });

  const CloudinaryAdditionalFilesUploadResult = await Promise.all(
    additionalFiles.map((file) => {
      return new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ resource_type: 'auto' }, async (error, result) => {
            if (error) {
              return reject(error);
            }

            if (!result) {
              throw new Error('No result returned from cloudinary');
            }

            resolve(result);
          })
          .end(file.buffer);
      });
    })
  );

  const randomDoctorPassword = Math.random().toString().slice(-8);
  const hashRandomDoctorPassword = await bcrypt.hash(
    randomDoctorPassword,
    Number(config.bcrypt_salt_rounds)
  );

  const doctorApplication = await prisma.user.create({
    data: {
      ...payload.user,
      password: hashRandomDoctorPassword,
      role: Role.DOCTOR,

      doctor: {
        create: {
          name: payload.user.name,
          email: payload.user.email,
          ...payload.doctor,
          resume: cloudinaryResumeUploadResult.secure_url,
          resumePublicId: cloudinaryResumeUploadResult.public_id,
          additionalFiles: CloudinaryAdditionalFilesUploadResult.map((file) => ({
            url: file.secure_url,
            publicId: file.public_id,
          })),
        },
      },
    },
    include: {
      doctor: true,
    },
  });

  const expirationSeconds = 60 * 60;
  const email = payload.user.email;
  const key = `doctor-application-otp:${email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  const appName = 'Smart Healthcare Limited';
  const appUrl = 'mdjasimuddin.com.bd';
  const userName = payload.user.name;
  const supportEmail = config.email_sender;

  redisClient.set(key, otpValue, {
    expiration: {
      type: 'EX',
      value: expirationSeconds,
    },
  });

  const emailVerifiedTempPath = path.join(
    process.cwd(),
    'src/app/templates/user-email-verified.ejs'
  );

  const EmailVerifiedTempData = {
    otpValue,
    appName,
    appUrl,
    userName,
    expirationMinutes: expirationSeconds / 60,
    supportEmail,
  };

  const htmlContent = await ejs.renderFile(emailVerifiedTempPath, EmailVerifiedTempData);

  await transporter.sendMail({
    from: config.email_sender,
    to: email,
    subject: `${otpValue} is your ${appName} verification code`,
    html: htmlContent,
  });

  return doctorApplication;
};

// done
const verifyDoctorEmail = async (payload: IVerifyDoctorEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const isUserExists = await prisma.user.findUnique({
    where: {
      email,
      role: Role.DOCTOR,
    },
  });

  console.log('Doctor find', isUserExists);

  if (!isUserExists) {
    throw new Error('Doctor Application not found. Please apply again.');
  }

  if (isUserExists.emailVerified) {
    throw new Error('Email Already Verified');
  }

  const key = `doctor-application-otp:${email}`;
  const redisOTP = await redisClient.get(key);

  if (!redisOTP) {
    throw new Error('Invalid otp');
  }

  if (redisOTP !== otp) {
    throw new Error('OTP does not match!');
  }

  await redisClient.del(key);

  const verifiedUser = await prisma.user.update({
    where: {
      id: isUserExists.id,
    },
    data: {
      emailVerified: true,
    },
    omit: {
      password: true,
    },
    include: {
      doctor: true,
    },
  });

  return verifiedUser;
};

const apporveDoctor = async (payload: IApproveDoctorPayload, reviewer: IRequestUser) => {
  const { doctorId, verificationStatus, rejectionResoan } = payload;
  // const otp = payload.otp;
  // const email = payload.email.trim().toLowerCase();

  const existingDoctor = await prisma.doctor.findUnique({
    where: {
      id: doctorId,
    },
    include: {
      user: true,
    },
  });

  if (!existingDoctor) {
    throw new Error('Doctor Application not found. Please apply again.');
  }

  if (existingDoctor.isDeleted) {
    throw new Error('Doctor Application Has Been Deleted');
  }

  if (existingDoctor.user.emailVerified) {
    throw new Error('Doctor has not verified their email yet. Application cannot be reviewed');
  }

  if (existingDoctor.verificationStatus !== DoctorVerificationStatus.PENDING) {
    throw new Error(
      `Doctor application has already been ${existingDoctor.verificationStatus.toLowerCase()}`
    );
  }

  if (verificationStatus === DoctorVerificationStatus.REJECTED && !rejectionResoan) {
    throw new Error(`Rejection Reasoan is required when rejection a doctor application`);
  }

  const updateDoctor = await prisma.doctor.update({
    where: {
      id: doctorId,
    },
    data: {
      verificationStatus,
      rejectionReason:
        verificationStatus === DoctorVerificationStatus.REJECTED ? rejectionResoan : null,
      reviewedBy: reviewer.userId,
      reviewedAt: new Date(),
    },
  });

  const isApproved = verificationStatus === DoctorVerificationStatus.APPROVED;

  const appName = 'Smart Healthcare Limited';
  const appUrl = 'mdjasimuddin.com.bd';
  const doctorName = updateDoctor.name;
  const supportEmail = config.email_sender;
  const loginUrl = 'http://localhost:5000/login';
  const teamName = 'Doctor Relations Team';
  const rejectionReason = updateDoctor.rejectionReason;

  const applicationTempPath = path.join(
    process.cwd(),
    `/src/app/templates/${isApproved ? 'doctorApplicationApprove.ejs' : 'doctorApplicationRejected.ejs'}`
  );

  const applicationTempData = {
    appName,
    appUrl,
    doctorName,
    supportEmail,
    loginUrl,
    teamName,
    rejectionReason,
  };

  const htmlContent = await ejs.renderFile(applicationTempPath, applicationTempData);

  transporter.sendMail({
    from: config.email_sender,
    to: updateDoctor.email,
    subject: isApproved
      ? 'Your Doctor Application Has been Approved'
      : 'Your Doctor Application Has Been Rejected',
    html: htmlContent,
  });

  return updateDoctor;
};

const getAllDoctors = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : 'createAt';
  const sortOrder = query.sortOrder ? query.sortOrder : 'desc';

  // const tags = query.tags ? JSON.parse(query.tags as string) : null;
  // const tagsArray = Array.isArray(tags) ? tags : [];

  const andConditions: DoctorWhereInput[] = [];

  // searching
  if (query.searchTerm) {
    andConditions.push({
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
    });
  }

  // filltering
  if (query.specialization) {
    andConditions.push({
      specialization: {
        equals: query.specialization,
        mode: 'insensitive',
      },
    });
  }

  if (query.email) {
    andConditions.push({
      email: {
        equals: query.email,
        mode: 'insensitive',
      },
    });
  }

  if (query.licenseNumber) {
    andConditions.push({
      licenseNumber: {
        equals: query.licenseNumber,
        mode: 'insensitive',
      },
    });
  }

  if (query.verificationStatus) {
    andConditions.push({
      verificationStatus: query.verificationStatus as DoctorVerificationStatus,
    });
  }

  // if (query.isDeleted) {
  //   andConditions.push({
  //     isDeleted: query.isDeleted === 'true' ? true : false,
  //   });
  // }

  andConditions.push({ isDeleted: false });

  const allDoctors = await prisma.doctor.findMany({
    where: {
      AND: andConditions.length > 0 ? andConditions : undefined,
    },
    take: limit,
    skip: skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    include: {
      user: {
        omit: {
          password: true,
        },
      },

      // schedules : true
      // appointment : true
      // prescriptions : true
    },
  });

  const totalDoctorCount = await prisma.doctor.count({
    where: {
      AND: andConditions,
    },
  });
  return {
    data: allDoctors,
    meta: {
      page: page,
      limit: limit,
      total: totalDoctorCount,
      totalPages: Math.ceil(totalDoctorCount / limit),
    },
  };
};

const updateDoctorProfile = async (payload: IUpdateDoctorProfilePayload, user: IRequestUser) => {
  // const doctorId = req.params.doctorId as string;
  const existingDoctor = await prisma.doctor.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!existingDoctor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor profile not found');
  }

  const updateDoctor = await prisma.doctor.update({
    where: { id: existingDoctor.id },
    data: payload,
  });

  return updateDoctor;
};

const getAllDoctorsListPublic = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : 'createAt';
  const sortOrder = query.sortOrder ? query.sortOrder : 'desc';

  const andConditions: DoctorWhereInput[] = [
    {
      isDeleted: false,
    },
    {
      verificationStatus: DoctorVerificationStatus.APPROVED,
    },
  ];

  // searching
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
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
          qualifications: {
            contains: query.searchTerm,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  // filltering
  if (query.specialization) {
    andConditions.push({
      specialization: {
        equals: query.specialization,
        mode: 'insensitive',
      },
    });
  }

  andConditions.push(
    { isDeleted: false },
    {
      verificationStatus: DoctorVerificationStatus.APPROVED,
    }
  );

  const allDoctors = await prisma.doctor.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip: skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    // sensitive field (email, licenseNumber, resume, user.password) dekhabo na
    select: {
      id: true,
      name: true,
      specialization: true,
      licenseNumber: true,
      experienceYears: true,
      bio: true,
      consultationsFee: true,
      createAt: true,
      // profilePhoto: true, experience: true, fee: true, bio: true -> schema te thakle add koro
    },
  });

  const totalDoctorCount = await prisma.doctor.count({
    where: {
      AND: andConditions,
    },
  });
  return {
    data: allDoctors,
    meta: {
      page: page,
      limit: limit,
      total: totalDoctorCount,
      totalPages: Math.ceil(totalDoctorCount / limit),
    },
  };
};

const getSingleDoctorPublicProfile = async (doctorId: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: {
      id: doctorId,
      isDeleted: false,
      verificationStatus: DoctorVerificationStatus.APPROVED,
    },
    select: {
      id: true,
      name: true,
      specialization: true,
      consultationsFee: true,
      experienceYears: true,
      licenseNumber: true,
      bio: true,
    },
  });

  if (!doctor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Doctor not found');
  }

  return doctor;
};

const getAvailableDoctorByTodaySchedule = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : 'createAt';
  const sortOrder = query.sortOrder ? query.sortOrder : 'desc';

  const now = new Date();
  const startOfToday = startOfDay(now); // aj 12:00 AM
  const startOfTomorrow = addDays(startOfToday, 1); // kal 12:00 AM

  const andConditions: DoctorWhereInput[] = [];

  // searching
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        {
          name: {
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
      ],
    });
  }

  // filltering
  if (query.specialization) {
    andConditions.push({
      specialization: {
        equals: query.specialization,
        mode: 'insensitive',
      },
    });
  }

  andConditions.push(
    { isDeleted: false },
    { verificationStatus: DoctorVerificationStatus.APPROVED },
    {
      schedules: {
        some: {
          isDeleted: false,
          startDateTime: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
        },
      },
    }
  );

  const availableDoctor = await prisma.doctor.findMany({
    where: {
      AND: andConditions,
    },
    take: limit,
    skip: skip,

    orderBy: {
      [sortBy]: sortOrder,
    },

    select: {
      id: true,
      name: true,
      specialization: true,
      licenseNumber: true,
      experienceYears: true,
      bio: true,
      consultationsFee: true,
      verificationStatus: true,
      createAt: true,
      schedules: {
        where: {
          isDeleted: false,
          status: ScheduleStatus.PUBLISHED,
          availableSlots: { gt: 0 },
          startDateTime: {
            gte: startOfToday,
            lt: startOfTomorrow,
            gt: now,
          },
        },
        orderBy: { startDateTime: 'asc' },
        select: {
          id: true,
          startDateTime: true,
          endDateTime: true,
          availableSlots: true,
          totalSlots: true,
        },
      },
    },
  });

  const totalDoctorCount = await prisma.doctor.count({
    where: {
      AND: andConditions,
    },
  });
  return {
    data: availableDoctor,
    meta: {
      page: page,
      limit: limit,
      total: totalDoctorCount,
      totalPages: Math.ceil(totalDoctorCount / limit),
    },
  };
};

export const DoctorServices = {
  applyAsDoctor,
  verifyDoctorEmail,
  apporveDoctor,
  getAllDoctors,
  updateDoctorProfile,
  getAvailableDoctorByTodaySchedule,
  getAllDoctorsListPublic,
  getSingleDoctorPublicProfile,
};
