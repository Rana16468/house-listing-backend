import { Status } from "@prisma/client";
import bcrypt from "bcrypt";
import httpStatus from "http-status";

import config from "../../config";


import catchError from "../../errors/catchError";
import { jwtHelpers } from "../../helper/jwtHelpers";
import prisma from "../../shared/prisma";
import { TAuth, TChanagePassword } from "./auth.interface";
import AppError from "../../errors/AppError";

type TJwtPayload = {
    id: string;
    role: string;
    email: string;
};

const loginAdminAccountIntoDb = async (payload: TAuth) => {
    try {
        const { email, password } = payload;

        if (!email) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                "Please provide an email or phone number to log in."
            );
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(email ? [{ email }] : []),
                ],
            },
        });

        if (!user) {
            throw new AppError(httpStatus.NOT_FOUND, "User account not found.");
        }


        if (user.isDeleted) {
            throw new AppError(
                httpStatus.FORBIDDEN,
                "This account has been deleted. Please contact support."
            );
        }

        if (user.status === Status.BLOCKED) {
            throw new AppError(
                httpStatus.FORBIDDEN,
                "Your account has been blocked. You cannot log in."
            );
        }

        // 4. Validate Password
        if (!user.password) {
            throw new AppError(
                httpStatus.UNAUTHORIZED,
                "Password not set for this account. Try social login or reset password."
            );
        }

        const isPasswordMatched = await bcrypt.compare(password, user.password);
        if (!isPasswordMatched) {
            throw new AppError(httpStatus.UNAUTHORIZED, "Invalid login credentials.");
        }

        if (!config.jwt_access_secret || !config.jwt_refresh_secret) {
            throw new AppError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "JWT Secret keys are missing from system configuration."
            );
        }
        const jwtPayload = {
            id: user.id,
            role: user.role,
            email: user.email,

        };

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

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isOnline: true,
                ...(payload.os && { os: payload.os }),
                ...(payload.browser && { browser: payload.browser }),
                ...(payload.device && { device: payload.device }),
                ...(payload.ipAddress && { ipAddress: payload.ipAddress }),
            },
        });

        return {
            accessToken,
            refreshToken
        };
    } catch (error) {
        throw catchError(error, "Failed to authenticate user");
    }
};

const changePasswordIntoDB = async (

    payload: TChanagePassword,
    userId: string,
) => {
    try {
        const { oldPassword, newPassword } = payload;

        // 1. Fetch user & check all flags early
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                password: true,
                status: true,
                isDeleted: true,
                isVerify: true
            },
        });

        if (!user) {
            throw new AppError(httpStatus.NOT_FOUND, 'User account not found.');
        }

        if (user.isDeleted) {
            throw new AppError(
                httpStatus.FORBIDDEN,
                'This account has been deleted. Please contact support.'
            );
        }

        if (user.status === Status.BLOCKED) {
            throw new AppError(
                httpStatus.FORBIDDEN,
                'Your account has been blocked.'
            );
        }

        if (!user.isVerify) {
            throw new AppError(
                httpStatus.FORBIDDEN,
                'Your account is not verified yet.'
            );
        }

        if (!user.password) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                'No password set for this account. Set a password via reset flow.'
            );
        }

        // 2. Validate Old Password
        const isPasswordMatched = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordMatched) {
            throw new AppError(
                httpStatus.UNAUTHORIZED,
                'Old password does not match.'
            );
        }

        // 3. Prevent using the same old password as new password
        if (oldPassword === newPassword) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                'New password cannot be the same as old password.'
            );
        }

        // 4. Hash New Password
        const hashedNewPassword = await bcrypt.hash(
            newPassword,
            Number(config.bcrypt_salt_rounds) || 10
        );

        // 5. Update password using ONLY primary key in `where`
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedNewPassword,
            },
        });

        return {
            message: 'Password changed successfully.',
        };
    } catch (error) {
        throw catchError(error, 'Failed to change password');
    }
};

const findBySpecificUserProfileIntoDb = async (userId: string) => {
    try {
        const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, 
            select: { id: true, 
                name: true, 
                email: true,
                 phone: true,
                  role: true, 
                  status: true,
                   photo: true,
                    isVerify   : true,
                     os: true,
                      browser: true,
                       device: true, 
                       ipAddress: true,
                        isOnline: true,
                         isDeleted: true } });
        if (!user) {
            throw new AppError(httpStatus.NOT_FOUND, 'User not found.');
        }
        return user;
    } catch (error) {
        throw catchError(error, 'Failed to fetch user profile');
    }
};

const AuthService = {
    loginAdminAccountIntoDb,
    changePasswordIntoDB,
    findBySpecificUserProfileIntoDb
};

export default AuthService;