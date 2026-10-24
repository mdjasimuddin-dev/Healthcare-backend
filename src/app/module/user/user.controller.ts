import { upload } from './../../lib/multer';
import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { sendResponse } from '../../utils/sendResponse';
import { UserServices } from './user.service';
import { fi } from 'zod/v4/locales';
import { file } from 'zod';
import { prisma } from '../../lib/prisma';

const uploadProfileImage = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new Error('File not uploaded.');
  }

  const userId = req.user?.userId;
  if (!userId) {
    throw new Error('User id not found');
  }

  const result = await UserServices.uploadProfileImage(req.file?.buffer, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User Profile picture update successfully',
    data: {
      result,
    },
  });
};

export const UserController = { uploadProfileImage };
