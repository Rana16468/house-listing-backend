import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid room ID");

const createReportRoomSchema = z.object({
  body: z.object({
    roomId: objectIdSchema,
    reportType: z.enum([
      "Wrong_Number",
      "Misleading_Photos",
      "Scam_OR_Spam",
    ]),
    ipAddress: z.string().optional()
  }),
});

const listReportRoomsSchema = z.object({
  query: z.object({
    roomId: objectIdSchema.optional(),
    reportType: z
      .enum(["Wrong_Number", "Misleading_Photos", "Scam_OR_Spam"])
      .optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const ReportRoomValidation = {
  createReportRoomSchema,
  listReportRoomsSchema,
};

export default ReportRoomValidation;
