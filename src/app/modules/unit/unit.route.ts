import { Router } from 'express';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';
import validationRequest from '../../middlewares/validationRequest';
import UnitController from './unit.controller';
import UnitValidation from './unit.validation';


const router = Router();


router.post('/recorded_unit',
    auth(Role.LANDLORD),
    validationRequest(UnitValidation.createUnitSchema),
    UnitController.recordedUnit
);
router.get('/find_my_all_unit',
    auth(Role.LANDLORD),
    UnitController.getAllUnitsFrom);
router.get("/find_by_specific_unit/:id", 
      auth(Role.LANDLORD),
      UnitController.findBySpecifcUnit
);

router.patch("/update_unit/:id",
    auth(Role.LANDLORD),
    validationRequest(UnitValidation.updateUnitSchema),
    UnitController.updateUnit
);

router.delete("/delete_unit/:id", 
    auth(Role.LANDLORD),
    UnitController.hardDeleteUnit
)

const UnitRouter = router;


export default UnitRouter;