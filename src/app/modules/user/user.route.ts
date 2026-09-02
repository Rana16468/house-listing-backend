import express from 'express';
import validationRequest from '../../middlewares/validationRequest';
import UserValidation from './user.validation';
import UserController from './user.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';



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


const UserRoutes = router;
export default UserRoutes;