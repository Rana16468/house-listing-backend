import express, { NextFunction, Request, Response } from 'express';
import validationRequest from '../../middlewares/validationRequest';
import UserValidation from './user.validation';
import UserController from './user.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';
import upload, { compressImage } from '../../utils/uplodeFile';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';


const router = express.Router();

router.post('/create-user',
    validationRequest(UserValidation.createUserZodSchema),
    UserController.createUser
);
router.post('/create-admin-account',
    auth(Role.ADMIN),
    validationRequest(UserValidation.createAdminAccountZodSchema),
    UserController.createAccount
);

router.patch('/change-profile-picture',
     auth(Role.ADMIN, Role.LANDLORD, Role.TENANT),
     upload.fields([{ name: "photo", maxCount: 1 }]),
     compressImage({ maxWidth: 1200, quality: 80 }), 
     (req: Request, _res: Response, next: NextFunction) => {
    try {
    
      if (req.body?.data) {
        req.body = JSON.parse(req.body.data);
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

    
      const photo = files?.photo?.[0];

      if (photo) {
        req.body.photo = photo.path.replace(/\\/g, "/");
      }

      next();
    } catch (error: any) {
      next(new AppError(httpStatus.BAD_REQUEST, "Invalid request data", error));
    }
  },
   
    validationRequest(UserValidation.updateUserZodSchema),
    UserController.changeProfilePicture
);


const UserRoutes = router;
export default UserRoutes;