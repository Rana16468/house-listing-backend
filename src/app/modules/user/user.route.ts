import express from 'express';
import validationRequest from '../../middlewares/validationRequest';
import UserValidation from './user.validation';
import UserController from './user.controller';



const router = express.Router();

router.post('/create-user',
    validationRequest(UserValidation.createUserZodSchema),
    UserController.createUser
);
router.post('/create-admin-account',
    validationRequest(UserValidation.createAdminAccountZodSchema),
    UserController.createAccount
);


const UserRoutes = router;
export default UserRoutes;