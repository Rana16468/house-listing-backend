import { RequestHandler } from "express";
import UserService from "./user.services";
import catchAsync from "../../utils/asyncCatch";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

const createUser:RequestHandler = catchAsync(async (req, res) => {
    
    const result = await UserService.createUserIntoDb(req.body);
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: "User created successfully",
        data: result,
    });
});

const createAccount:RequestHandler = catchAsync(async (req, res) => {
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


const UserController = {
    createUser,
    createAccount,
    changeProfilePicture
};
export default UserController;
