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

const AuthController = {
  loginAdminUser,
};
export default AuthController;