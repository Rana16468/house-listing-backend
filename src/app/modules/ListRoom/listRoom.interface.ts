import {
  PropertyCategory,
  WaterBill,
  GasSupply,
  ParkingSpace,
} from "@prisma/client";

export interface IListRoomInput {
  address: string;
  availableFrom: Date | string;
  category: PropertyCategory;
  contactNumber: string;
  description: string;
  gasSupply?: GasSupply | null;
  location: string;
  parkingSpace?: ParkingSpace;
  photos: string[];
  rent: number;
  serviceCharge?: number | null;
  waterBill?: WaterBill;
  userId: string;
}