// 1. Enums Types
export type RentalCategory = "house_flat" | "sublet_room";

export type TenantType = "family" | "bachelor_male" | "bachelor_female" | "office";

export type ParkingType = 
  | "none" 
  | "car" 
  | "bike" 
  | "car_and_bike" 
  | "garage" 
  | "street" 
  | "not_available";

export type GasType = "line" | "cylinder";

export type ElectricityType = "prepaid" | "postpaid";

export interface ILocation {
  division: string;
  district: string;
  thana: string;
  area: string;
}

export interface IUtilityBreakdown {
  baseRent: number;
  electricity: number;
  electricityType: ElectricityType;
  gas: number;
  gasType: GasType;
  serviceCharge: number;
  water: number;
}

export interface IContactInfo {
  phone: string;
  whatsapp?: boolean;
  telegram?: boolean;
  imo?: boolean;
  teams?: boolean;
  telegramHandle?: string;
  teamsLink?: string;
}

export interface ICreatePostInput {
  title: string;
  description: string;
  category: RentalCategory;
  tenantType: TenantType;
  parking?: ParkingType;
  address?: string;
  liveLocationUrl?: string;
  images?: string[];
  availableFrom: string;
  pin: string;
  source?: string;
  location: ILocation;
  utilities: IUtilityBreakdown;
  contact: IContactInfo;
  os?: string;
  browser?: string;
  device?: string;
  ipAddress?: string;
  deviceId: string
}

// 4. Response Post Interface (Database Record after creation)
export interface IPost extends ICreatePostInput {
  id: string; // MongoDB _id
  createdAt: Date | string;
  updatedAt: Date | string;
}