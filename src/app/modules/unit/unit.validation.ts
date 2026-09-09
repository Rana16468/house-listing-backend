import { UnitStatus, UnitType } from '@prisma/client';
import { z } from 'zod';

export const UnitTypeEnum = z.enum([UnitType.FLAT, UnitType.OFFICE, UnitType.ROOM, UnitType.SEAT]);
export const UnitStatusEnum = z.enum([UnitStatus.MAINTENANCE, UnitStatus.OCCUPIED, UnitStatus.VACANT]);

const createUnitSchema = z.object({
    body: z.object({
        propertyId: z.string({ error: "property Id is required" }),
        parentUnitId:z.string().optional(),
        currentSubToken: z.string({error:"current subscription is requited"}),
        name: z.string({ error: "name is required" }).min(1, 'Name is required').max(100),
        seats: z.number().int().min(0).optional().nullable(),
        type: UnitTypeEnum,
        baseRent: z.number().nonnegative('Base rent cannot be negative'),
        status: UnitStatusEnum.default('VACANT').optional(),
    })
});

const updateUnitSchema = z.object({
  body: z.object({
    name: z.string({ error: 'name is required' }).min(1, 'Name is required').optional(),
    seats: z.number().int().min(0).optional().nullable(),
    type: z.enum([UnitType.FLAT, UnitType.OFFICE, UnitType.ROOM, UnitType.SEAT]).optional(),
    baseRent: z.number().optional(), // 👈 () যোগ করা হয়েছে
    status: UnitStatusEnum.optional().default('VACANT'), // 👈 optional() সঠিকভাবে বসানো হয়েছে
  }),
});

const unitQuerySchema = z.object({
    propertyId: z.string().uuid().optional(),
    type: UnitTypeEnum.optional(),
    status: UnitStatusEnum.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
});

export type CreateUnitDto = z.infer<typeof createUnitSchema>;
export type UpdateUnitDto = z.infer<typeof updateUnitSchema>;
export type UnitQueryDto = z.infer<typeof unitQuerySchema>;

const UnitValidation = {
    createUnitSchema,
    updateUnitSchema,
    unitQuerySchema
};
export default UnitValidation