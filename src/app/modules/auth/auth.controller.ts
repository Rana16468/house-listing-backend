import { RequestHandler } from "express";
import catchAsync from "../../utils/asyncCatch";
import AuthService from "./auth.services";
import config from "../../config";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

const loginAdminUser: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.loginAdminAccountIntoDb(req.body);

  const { refreshToken, accessToken } = result;
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
      refreshToken
    },
  });
});

const changePassword: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.changePasswordIntoDB(req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Password changed successfully",
    data: result,
  });
});

const findBySpecificUserProfile: RequestHandler = catchAsync(async (req, res) => {
  const result = await AuthService.findBySpecificUserProfileIntoDb(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User profile fetched successfully",
    data: result,
  });
});

const AuthController = {
  loginAdminUser,
  changePassword,
  findBySpecificUserProfile
};
export default AuthController;