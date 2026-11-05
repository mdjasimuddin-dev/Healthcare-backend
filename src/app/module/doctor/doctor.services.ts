import { Multer } from 'multer';
import { prisma } from '../../lib/prisma';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../../lib/cloudinary';
import { Role } from '../../../generated/prisma/enums';
import bcrypt from 'bcryptjs';
import config from '../../config';
import crypto from 'crypto';
import { redisClient } from '../../lib/redis';
import path from 'node:path';
import ejs from 'ejs';
import { transporter } from '../../lib/nodemailer';
import { IApplyAsDoctorPayload, IVerifyDoctorEmailPayload } from './doctor.interface';

const applyAsDoctor = async (
  payload: IApplyAsDoctorPayload,
  resume: Express.Multer.File | null,
  additionalFiles: Express.Multer.File[]
) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: payload.user.email,
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

export const DoctorServices = {
  applyAsDoctor,
  verifyDoctorEmail,
};
