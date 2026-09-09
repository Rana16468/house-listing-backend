import { UnitType, UnitStatus } from '@prisma/client';

export interface IUnit {
  propertyId: string;
  parentUnitId?: string | null;
  name: string;
  seats?: number | null;
  type: UnitType;
  baseRent: number;
  status: UnitStatus;
  currentSubToken: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateUnitInput = Omit<IUnit, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: UnitStatus;
};

export type UpdateUnitInput = Partial<CreateUnitInput>;