import { RequestHandler } from "express";

import catchAsync from "../../utils/asyncCatch";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import config from "../../config";
import UserService from "./user.services";
import AppError from "../../errors/AppError";

const createUser: RequestHandler = catchAsync(async (req, res) => {

    const clientIpAddress = req.ip ?? req.socket.remoteAddress;
    if (!clientIpAddress) {
        throw new AppError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Unable to determine the client IP address."
        );
    }

    const result = await UserService.createUserIntoDb(
        req.body,
        clientIpAddress.replace(/^::ffff:/, "")
    );
    const { accessToken, refreshToken } = result;
    res.cookie("refreshToken", refreshToken, {
        secure: config.NODE_ENV === "production",
        httpOnly: true,
    });
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Successfully Login",
        data: {
            accessToken,
            refreshToken,
        }
    });
});

const createAccount: RequestHandler = catchAsync(async (req, res) => {
    const result = await UserService.createAccountIntoDb(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "Account created successfully",
        data: result,
    });
});

const changeProfilePicture: RequestHandler = catchAsync(async (req, res) => {
    const result = await UserService.changeProfilePictureIntoDB(req.user.id, req.body);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Profile picture changed successfully",
        data: result,
    });
});

const findMyProfile: RequestHandler = catchAsync(async (req, res) => {
    const result = await UserService.findMyProfileIntoDb(req.user.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Successfully fetched user profile",
        data: result,
    });
});

const avater: RequestHandler = catchAsync(async (req, res) => {
    const result = await UserService.avaterIntoDb(req.user.id);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Successfully fetched user profile",
        data: result,
    });
});


const UserController = {
    createUser,
    createAccount,
    changeProfilePicture,
    findMyProfile,
    avater
};
export default UserController;