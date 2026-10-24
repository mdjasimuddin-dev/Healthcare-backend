import { Request, Response } from 'express';
import { sendResponse } from '../../utils/sendResponse';
import { UserServices } from './user.service';

const uploadProfileImage = async (req: Request, res: Response) => {
  const fileData = req.body;
  const result = await UserServices.uploadProfileImage;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully',
    data: {
      // accessToken,
      // refreshToken,
    },
  });
};

export const UserController = { uploadProfileImage };
