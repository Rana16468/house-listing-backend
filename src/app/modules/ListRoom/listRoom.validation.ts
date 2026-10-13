import { error } from "console";
import { z } from "zod";

const propertyCategorySchema = z.enum([
  "Family",
  "Bachelor",
  "Sublet",
  "Hostel",
  "Office",
]);

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid room ID");

const roomFields = {
  address: z.string().trim().min(3).max(300),
  area: z.string().trim().min(2).max(200),
  types: propertyCategorySchema,
  description: z.string().trim().min(10).max(5000),
  neighborhood: z.string().trim().min(2).max(200),
  photos: z.array(z.string().trim().min(1)).max(5),
};

const createRoomListingValidationSchema = z.object({
  body: z.object({
    address: roomFields.address,
    area: roomFields.area,
    types: roomFields.types,
    description: roomFields.description,
    neighborhood: roomFields.neighborhood,
    photos: roomFields.photos.optional(),
  }),
});

const updateRoomListingValidationSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z
    .object({
      address: roomFields.address.optional(),
      area: roomFields.area.optional(),
      types: roomFields.types.optional(),
      description: roomFields.description.optional(),
      neighborhood: roomFields.neighborhood.optional(),
      photos: roomFields.photos.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field must be provided",
    }),
});

const roomIdParamsValidationSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

const listRoomQueryValidationSchema = z.object({
  query: z.object({
    search: z.string().trim().max(200).optional(),
    area: z.string().trim().max(200).optional(),
    types: propertyCategorySchema.optional(),
    neighborhood: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    address: z.string().optional(),
    description: z.string().optional()
  }),
});

const viewCountSchema = z.object({
  body: z.object({

    ipAddress: z.string().optional(),
    roomId: z.string({ error: "roomId is required" })

  })
})

export const ListRoomValidation = {
  createRoomListingValidationSchema,
  updateRoomListingValidationSchema,
  roomIdParamsValidationSchema,
  listRoomQueryValidationSchema,
  viewCountSchema
};
