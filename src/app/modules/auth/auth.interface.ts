export  interface  TAuth {

    email: string;
    password: string;
    os?: string;
    browser?: string;
    device?: string;
    ipAddress?: string;
}

export interface TChanagePassword {
    oldPassword: string;
    newPassword: string;
}