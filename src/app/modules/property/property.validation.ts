import { z } from 'zod';

 const createPropertySchema = z.object({
  body: z.object({
    
    currentSubId: z.string({
      error: 'Subscription ID is required',
    }).uuid('Invalid Subscription ID format'),
    flatName: z
      .string({ error: 'Flat name is required' })
      .max(150, 'Flat name cannot exceed 150 characters'),
    Floor: z
      .number({ error: 'Floor number is required' })
      .int('Floor must be an integer'),
    address: z.string().max(250, 'Address cannot exceed 250 characters').optional(),
  }),
});

 const updatePropertySchema = z.object({
  body: createPropertySchema.shape.body.partial(),
});

const PropertyValidation={
    createPropertySchema,
    updatePropertySchema
    
};
export default PropertyValidation