import { z } from 'zod';

const PropertyCategoryEnum = z.enum([
  'House',
  'Flat',
  'Sublet',
  'SingleRoom',
  'OfficeSpace',
]);

const WaterBillEnum = z.enum(['Included', 'Separate', 'Optional']);

const GasSupplyEnum = z.enum(['LineGas', 'Cylinder']);

const ParkingSpaceEnum = z.enum(['Available', 'NotAvailable', 'NotSpecified']);

const createRoomListingValidationSchema = z.object({
  body: z.object({
    address: z.string({
      error: 'Address is required',
    }).min(3, { message: 'Address must be at least 3 characters long' }),

    availableFrom: z.string({
      error: 'Available date is required',
    }),

    category: PropertyCategoryEnum,

    contactNumber: z.string({
      error: 'Contact number is required',
    }).min(10, { message: 'Contact number must be valid' }),

    description: z.string({
      error: 'Description is required',
    }).min(10, { message: 'Description must be at least 10 characters long' }),

    gasSupply: GasSupplyEnum.optional().nullable(),

    location: z.string({
      error: 'Location is required',
    }),

    parkingSpace: ParkingSpaceEnum.default('NotSpecified').optional(),

    photos: z.array(z.string(), {
      error: 'Photos array is required',
    }).min(1, { message: 'At least one photo path or URL is required' }).optional(),

    rent: z.number({
      error: 'Rent amount is required',
    }).positive({ message: 'Rent must be a positive number' }),

    serviceCharge: z.number().positive().optional().nullable(),

    waterBill: WaterBillEnum.default('Optional').optional(),
  }),
});


const updateRoomListingValidationSchema = z.object({
  body: z.object({
    address: z.string().min(3).optional(),
    availableFrom: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
    category: PropertyCategoryEnum.optional(),
    contactNumber: z.string().min(10).optional(),
    description: z.string().min(10).optional(),
    gasSupply: GasSupplyEnum.optional().nullable(),
    location: z.string().optional(),
    parkingSpace: ParkingSpaceEnum.optional(),
    photos: z.array(z.string()).min(1).optional(),
    rent: z.number().positive().optional(),
    serviceCharge: z.number().positive().optional().nullable(),
    waterBill: WaterBillEnum.optional(),
  }),
});

export const ListRoomValidation = {
  createRoomListingValidationSchema,
  updateRoomListingValidationSchema,
};