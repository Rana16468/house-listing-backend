export interface TUser {

    name: string;
    phone: string;
    password: string;
    email: string;
    status:"ACTIVE" | "INACTIVE" | "BLOCKED";
    role :"ADMIN" | "LANDLORD" | "TENANT";
    os?: string;
    browser?: string;
    device?: string;
    ipAddress?: string;
    isOnline?: boolean;
    isDeleted?: boolean;

}

export type TJwtPayload = {
  id: string;
  role: string;
  email: string;
};