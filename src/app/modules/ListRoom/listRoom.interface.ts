import { PropertyCategory } from "@prisma/client";

export interface IListRoomInput {
  address: string;
  area: string;
  types: PropertyCategory;
  description: string;
  neighborhood: string;
  photos?: string[];
}

export type IUpdateListRoomInput = Partial<IListRoomInput>;
