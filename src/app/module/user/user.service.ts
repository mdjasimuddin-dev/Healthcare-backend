import {
  UpdateApiOptions,
  UploadApiResponse,
} from './../../../../node_modules/cloudinary/types/index.d';
import { cloudinary } from '../../lib/cloudinary';
import { prisma } from '../../lib/prisma';

const uploadProfileImage = async (buffer: Buffer, UserId: string) => {
  // cloudinary.uploader
  //   .upload_stream({ resource_type: 'auto' }, async (error, result) => {
  //     if (error) {
  //       console.log(error);
  //       throw new Error('File not uploaded');
  //     }

  //     const updateUser = await prisma.user.update({
  //       where: {
  //         id: UserId,
  //       },
  //       data: {
  //         imageUrl: result?.secure_url,
  //         imagePublicId: result?.public_id,
  //       },
  //     });

  //     const user = await prisma.user.findUnique({
  //       where: {
  //         id: UserId,
  //       },

  //       omit: {
  //         password: true,
  //       },
  //     });

  //     return user;
  //   })
  //   .end(buffer);

  // ===================== Fine Current User ================
  const currentUser = await prisma.user.findUnique({
    where: {
      id: UserId,
    },
    select: {
      imageUrl: true,
      imagePublicId: true,
    },
  });

  // ==================== Upload user photo into cloudinary =========================
  const cloudinaryResult = await new Promise<UploadApiResponse>((resolve, reject) => {
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
      .end(buffer);
  });

  // ============== Update user profile photo ============================
  const updateUser = await prisma.user.update({
    where: {
      id: UserId,
    },
    data: {
      imageUrl: cloudinaryResult.secure_url,
      imagePublicId: cloudinaryResult.public_id,
    },

    omit: {
      password: true,
    },
  });

  // ============ Delete user previous profile picture ================
  if (currentUser?.imagePublicId && currentUser.imageUrl) {
    await cloudinary.uploader.destroy(currentUser.imagePublicId);
  }

  return updateUser;
};

export const UserServices = { uploadProfileImage };
