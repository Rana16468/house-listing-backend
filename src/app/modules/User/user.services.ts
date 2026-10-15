import { Role, Status } from "@prisma/client";
import AppError from "../../errors/AppError";
import prisma from "../../shared/prisma";
import { TJwtPayload, TUser } from "./user.interface";
import httpStatus from 'http-status'
import config from "../../config";
import { jwtHelpers } from "../../helper/jwtHelpers";
import bcrypt from 'bcrypt';
import { sendFileToCloudinary } from "../../utils/Cloudinary/sendFileToCloudinary";
import deleteFileFromCloudinary from "../../utils/Cloudinary/deleteFileFromCloudinary";
import fs from 'fs';
import catchError from "../../errors/catchError";
import { cacheAside, invalidateCacheDomains } from "../../redis/cache";
import { cacheKeys, cacheTtlSeconds } from "../../redis/cacheKeys";

const createUserIntoDb = async (
    payload: Partial<TUser> & Pick<TUser, "email">,
    clientIpAddress: string
) => {
    if (!config.jwt_access_secret || !config.jwt_refresh_secret) {
        throw new AppError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "JWT Secret keys are not defined in the configuration"
        );
    }

    // Dynamic IP fetch using the passed clientIpAddress (fallback to empty if local/invalid)
    let cityData = null;
    try {
        const ipToCheck = payload.ipAddress ? payload.ipAddress : clientIpAddress || '';
        
        console.log("Client IP Address for GeoIP lookup:", ipToCheck);
        const ipApiUrl = ipToCheck ? `http://ip-api.com/json/${ipToCheck}` : `http://ip-api.com/json/`;
        const response = await fetch(ipApiUrl);
        const data = await response.json();
       
        cityData = data.city || null;
        
    } catch (error) {
        console.error("Failed to fetch IP geolocation:", error);
    }

    const { user, created } = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findFirst({
            where: { email: payload.email },
            select: {
                id: true,
                role: true,
                email: true,
                status: true,
                isDeleted: true,
                phone: true,
            },
        }); 

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

            // Fixed: Throw an AppError instead of returning an untyped object
            if (!existingUser.phone) {
                throw new AppError(
                    httpStatus.BAD_REQUEST,
                    "Phone number is required. Account creation is not allowed without a phone number."
                );
            }

            // If account exists, update user's current session/location info
            const updatedUser = await tx.user.update({
                where: { id: existingUser.id },
                data: {
                    os: payload.os,
                    browser: payload.browser,
                    device: payload.device,
                    ipAddress: payload.ipAddress ? payload.ipAddress : clientIpAddress,
                    city: cityData,
                    isOnline: payload.isOnline ?? true,
                },
                select: {
                    id: true,
                    role: true,
                    email: true,
                },
            });

            return { user: updatedUser, created: false };
        }

        // Registration condition: Phone and Name are mandatory for new accounts
        if (!payload.phone) {
            throw new AppError(
                httpStatus.BAD_REQUEST,
                "Phone number is required. Account creation is not allowed without a phone number."
            );
        }

        if (!payload.name) {
            throw new AppError(httpStatus.BAD_REQUEST, "Name is required to create an account.");
        }

        const newUser = await tx.user.create({
            data: {
                name: payload.name,
                phone: payload.phone,
                email: payload.email,
                photo: payload.photo,
                os: payload.os,
                browser: payload.browser,
                device: payload.device,
                ipAddress: payload.ipAddress ? payload.ipAddress : clientIpAddress,
                isOnline: payload.isOnline ?? true,
                isVerify: true,
                status: Status.ACTIVE,
                city: cityData,
                role: payload.role ?? Role.USER,
            },
            select: {
                id: true,
                role: true,
                email: true,
            },
        });

        return { user: newUser, created: true };
    });

    if (created) {
        await invalidateCacheDomains("users", "rooms", "saved-rooms");
    }

    const jwtPayload: TJwtPayload = {
        id: user.id,
        role: user.role,
        email: user.email??"",
    };

    const accessToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_access_secret,
        config.expires_in as string
    );

    const refreshToken = jwtHelpers.generateToken(
        jwtPayload,
        config.jwt_refresh_secret,
        config.refresh_expires_in as string
    );

    return { accessToken, refreshToken };
};

const createAccountIntoDb = async (payload: TUser) => {
    if (!payload.phone) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            "Phone number is required. Account creation is not allowed without a phone number."
        );
    }

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

    await invalidateCacheDomains("users", "rooms", "saved-rooms");
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
    await invalidateCacheDomains("users", "rooms", "saved-rooms");

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
        }) as any;

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
        await invalidateCacheDomains("users", "rooms", "saved-rooms");
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
        await invalidateCacheDomains("users", "rooms", "saved-rooms");

        return updatedUser && {
            status: true,
            message: 'Profile picture updated successfully',
        };
    } catch (error) {
        throw catchError(error, 'Failed to update profile');
    }
};

const findMyProfileIntoDb = async (userId: string) => {

    try {


        const result = await cacheAside(
            "users",
            cacheKeys.users.profile(userId),
            cacheTtlSeconds.profile,
            () => prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    photo: true,
                    role: true,
                    status: true,
                    isVerify: true,
                    browser: true,
                    os: true,
                    device: true,
                    ipAddress: true,
                    createdAt: true
                }
            })
        );

        return result


    }

    catch (error) {
        throw catchError(error, 'Failed to update profile');
    }
}

const avaterIntoDb=async(userId:string)=>{
    try {
        const  result = await prisma.user.findUnique({
            where: { id: userId },
            select:{
                id:true,
                photo:true ,
                phone:true,
                name:true ,

            }
        });

        return result

        
    } catch (error) {
        throw catchError(error, 'Failed to update avatar');
    }
};

const UserService = {
    createUserIntoDb,
    createAccountIntoDb,
    changeProfilePictureIntoDB,
    findMyProfileIntoDb,
    avaterIntoDb
};

export default UserService;