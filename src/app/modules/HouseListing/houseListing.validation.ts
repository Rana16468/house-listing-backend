import { z } from "zod";


export const RentalCategoryEnum = z.enum(["house_flat", "sublet_room"]);
export const TenantTypeEnum = z.enum(["family", "bachelor_male", "bachelor_female", "office"]);
export const ParkingTypeEnum = z.enum(["none", "car", "bike", "car_and_bike", "garage", "street", "not_available"]);
export const GasTypeEnum = z.enum(["line", "cylinder"]);
export const ElectricityTypeEnum = z.enum(["prepaid", "postpaid"]);

// Embedded Schema Schemas
const LocationSchema = z.object({
    division: z.string().min(1).max(100),
    district: z.string().min(1).max(100),
    thana: z.string().min(1).max(100),
    area: z.string().min(1).max(100),
});

const UtilityBreakdownSchema = z.object({
    baseRent: z.number().nonnegative(),
    electricity: z.number().nonnegative().default(0),
    electricityType: ElectricityTypeEnum,
    gas: z.number().nonnegative().default(0),
    gasType: GasTypeEnum,
    serviceCharge: z.number().nonnegative().default(0),
    water: z.number().nonnegative().default(0),
});

const ContactInfoSchema = z.object({
    phone: z.string().min(11).max(15),
    whatsapp: z.boolean().default(false),
    telegram: z.boolean().default(false),
    imo: z.boolean().default(false),
    teams: z.boolean().default(false),
    telegramHandle: z.string().max(100).optional(),
    teamsLink: z.string().url().optional().or(z.literal("")),
});


// Main Post Payload Schema
const CreatePostSchema = z.object({
    body: z.object({
        title: z.string().min(3, "Title too short").max(100, "Title exceeds 100 characters"),
        description: z.string().min(10, "Description too short").max(3000, "Description exceeds 3000 characters"),
        category: RentalCategoryEnum,
        tenantType: TenantTypeEnum,
        parking: ParkingTypeEnum.default("none"),
        address: z.string().max(255).optional(),
        liveLocationUrl: z.string().url().max(555).optional().or(z.literal("")),
        images: z.array(z.string()).default([]),
        availableFrom: z.string(),
        pin: z.string().min(4).max(10),
        source: z.string().default("user"),
        deviceId: z.string({error:"deviceId is required"}),
        // Embedded Structured Fields
        location: LocationSchema,
        utilities: UtilityBreakdownSchema,
        contact: ContactInfoSchema,

        // Metadata Fields
        os: z.string().max(100).optional(),
        browser: z.string().max(100).optional(),
        device: z.string().max(100).optional(),
        ipAddress: z.string().optional(),
    })
});

// TypeScript Types Derived from Zod
export type TCreatePostInput = z.infer<typeof CreatePostSchema>;

const PostValidation={
    CreatePostSchema
};

export default PostValidation