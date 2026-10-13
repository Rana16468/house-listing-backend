import { z } from "zod";

const saveRoomSchema = z.object({
  body: z.object({
    listRoomId: z
      .string({
        error: "listRoomId is required",
      })
      .regex(/^[a-f\d]{24}$/i, "Invalid room ID"),
  }),
});

const deleteSavedRoomSchema = z.object({
  params: z.object({
    listRoomId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid room ID"),
  }),
});

const SaveRoomValidation = {
  saveRoomSchema,
  deleteSavedRoomSchema,
};
export default SaveRoomValidation;
