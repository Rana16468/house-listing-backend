import { Router } from 'express';
import validationRequest from '../../middlewares/validationRequest';
import PropertyValidation from './property.validation';
import PropertyController from './property.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';


const router = Router();

router.post(
  '/property_recorded',
  auth(Role.LANDLORD),
  validationRequest(PropertyValidation.createPropertySchema),
  PropertyController.createProperty
);

router.get("/find_my_property/:currentSubId",
  auth(Role.LANDLORD),
  PropertyController.getAllProperties
);

router.get("/find_specific_property/:id",
  auth(Role.LANDLORD),
  PropertyController.getPropertyById

);

router.patch("/update_property/:id",
    auth(Role.LANDLORD),
    validationRequest(PropertyValidation.updatePropertySchema),
    PropertyController.updateProperty
)


export const PropertyRoutes = router;