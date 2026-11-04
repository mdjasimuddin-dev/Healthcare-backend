import { Multer } from 'multer';
import { prisma } from '../../lib/prisma';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../../lib/cloudinary';
import { create } from 'node:domain';
import { name } from 'ejs';
import { url } from 'node:inspector';
import { Role } from '../../../generated/prisma/enums';
import bcrypt from 'bcryptjs';
import config from '../../config';

const applyAsDoctor = async (
  payload: any,
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

  return doctorApplication;
};

export const DoctorServices = {
  applyAsDoctor,
};
