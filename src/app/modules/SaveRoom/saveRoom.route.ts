import express from 'express';
import SaveRoomController from './saveRoom.controller';
import auth from '../../middlewares/auth';

import validationRequest from '../../middlewares/validationRequest';
import SaveRoomValidation from './saveRoom.validation';
import { Role } from '@prisma/client';


const router = express.Router();

router.delete("/:listRoomId",
    auth(Role.USER),
    SaveRoomController.deleteSavedRoom)

router.post("/", auth(Role.USER),
    validationRequest(SaveRoomValidation.saveRoomSchema),
    SaveRoomController.saveRoom);
router.get("/", auth(Role.USER), SaveRoomController.findSavedRoomsByUserId)


const SaveRoomRoute = router;
export default SaveRoomRoute;