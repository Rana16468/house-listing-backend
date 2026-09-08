export interface IProperty {
  currentSubId: string;
  flatName: string;
  Floor: number;
  address?: string | null;
  isDeleted: boolean;
  
}

export type ICreatePropertyPayload = Omit<
  IProperty,
  'id' | 'isDeleted' | 'createdAt' | 'updatedAt'
>;

export type IUpdatePropertyPayload = Partial<ICreatePropertyPayload>;