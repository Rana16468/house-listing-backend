import express from 'express';
import validationRequest from '../../middlewares/validationRequest';
import AuthValidation from './auth.validation';
import AuthController from './auth.controller';



const router = express.Router();
router.post('/admin-login',
     validationRequest(AuthValidation.loginZodSchema),
      AuthController.loginAdminUser);

const AuthRoutes = router;
export default AuthRoutes;
