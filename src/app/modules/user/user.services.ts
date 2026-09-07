import { Role, Status } from "@prisma/client";
import prisma from "../../shared/prisma";
import { TJwtPayload, TUser } from "./user.interface";
import { jwtHelpers } from "../../helper/jwtHelpers";
import config from "../../config";
import fs from 'fs';
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import bcrypt from "bcrypt";
import catchError from "../../errors/catchError";
import { sendFileToCloudinary } from "../../utils/Cloudinary/sendFileToCloudinary";
import deleteFileFromCloudinary from "../../utils/Cloudinary/deleteFileFromCloudinary";

const createUserIntoDb = async (payload: TUser) => {

 
 

  return await prisma.$transaction(async (tx) => {
    // 1. Check if user exists (including soft-deleted & blocked checks)
    const existingUser = await tx.user.findFirst({
      where: {
        email: payload.email,
      },
      select: {
        id: true,
        role: true,
        email: true,
        status: true,
        isDeleted: true,
        phone: true
      },
    });

    // 2. Explicit Error Validations for edge cases
    if (existingUser) {
      if (existingUser.isDeleted) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "This account has been deleted. Please contact support."
        );
      }

      if (existingUser.status === Status.BLOCKED) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          "Your account has been blocked. You cannot sign in."
        );
      }
    }

    let user;

    // 3. Perform Upsert/Creation with clean logic
    if (!existingUser) {
      user = await tx.user.create({
        data: {
          ...payload,
          isVerify: true,
          status: Status.ACTIVE,
        },
      });
    } else {
      user = await tx.user.update({
        where: { email: payload.email },
        data: {
          ...payload,
          isVerify: true,
          status: Status.ACTIVE,
        },
      });
    }

    // 4. Construct JWT Payload
    const jwtPayload = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    // 5. Token Generation with config verification
    if (!config.jwt_access_secret || !config.jwt_refresh_secret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "JWT Secret keys are not defined in the configuration"
      );
    }

    const accessToken = jwtHelpers.generateToken(
      jwtPayload as TJwtPayload,
      config.jwt_access_secret as string,
      config.expires_in as string
    );

    const refreshToken = jwtHelpers.generateToken(
      jwtPayload as TJwtPayload,
      config.jwt_refresh_secret as string,
      config.refresh_expires_in as string
    );

    return {
      accessToken,
      refreshToken,
    };
  });
};

const createAccountIntoDb = async (payload: TUser) => {
  // 1. Validate mandatory identifier
  if (!payload.email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Either email or phone is required to create an account'
    );
  }

  // 2. Check existing account state (Find by unique email or phone)
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        ...(payload.email ? [{ email: payload.email }] : []),
        ...(payload.phone ? [{ phone: payload.phone }] : []),
      ],
    },
    select: { id: true, status: true, isDeleted: true, email: true, phone: true },
  });

  if (existingUser?.isDeleted) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This account has been deleted. Please contact support.'
    );
  }

  if (existingUser?.status === Status.BLOCKED) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account has been blocked. You cannot sign in.'
    );
  }

  // 3. Validate JWT config early
  if (!config.jwt_access_secret || !config.jwt_refresh_secret) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'JWT Secret keys are not defined in the configuration'
    );
  }

  // 4. Hash password if provided
  const hashedPassword = payload.password
    ? await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds) || 10)
    : undefined;

  // 5. Build base user payload defaults
  const userData = {
    ...payload,
    ...(hashedPassword && { password: hashedPassword }),
    role: payload.role || Role.ADMIN, // Default fallback role
    status: Status.ACTIVE,
    
    isVerify: true,
  };

  let user;

  if (existingUser) {
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: userData,
    });
  } else {
    user = await prisma.user.create({
      data: userData,
    });
  }

  // 7. Generate JWT Payload
  const jwtPayload = {
    id: user.id,
    role: user.role,
    email: user.email,
    phone: user.phone,
  };

  // 8. Issue Authentication Tokens
  const accessToken = jwtHelpers.generateToken(
    jwtPayload as TJwtPayload,
    config.jwt_access_secret as string,
    config.expires_in as string
  );

  const refreshToken = jwtHelpers.generateToken(
    jwtPayload as TJwtPayload,
    config.jwt_refresh_secret as string,
    config.refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken
  };
};

const changeProfilePictureIntoDB = async (
  userId: string,
  payload: Partial<TUser>
) => {
  try {
    
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        photo: true,
        isDeleted: true,
        status: true,
      },
    });

    if (!existingUser) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
    }

    if (existingUser.isDeleted) {
      throw new AppError(httpStatus.FORBIDDEN, 'This account has been deleted.');
    }

    const updateData: Record<string, any> = { ...payload };

    if (payload.photo) {
      const localFilePath = payload.photo;

      try {
        const fileName = `profile-${userId}-${Date.now()}`;
        const cloudinaryResponse = await sendFileToCloudinary(fileName, localFilePath);

        if (cloudinaryResponse?.secure_url) {
    
          if (existingUser.photo && existingUser.photo.includes('cloudinary.com')) {
            await deleteFileFromCloudinary(existingUser.photo);
          }
          updateData.photo = cloudinaryResponse.secure_url;
        }
      } catch (uploadError) {
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
        throw new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to upload image to Cloudinary'
        );
      }
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        photo: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return updatedUser && {
        status:true ,
        message: 'Profile picture updated successfully',
    };
  } catch (error) {
    throw catchError(error, 'Failed to update profile');
  }
};

const UserService = {
  createUserIntoDb,
  createAccountIntoDb,
  changeProfilePictureIntoDB
};

export default UserService;