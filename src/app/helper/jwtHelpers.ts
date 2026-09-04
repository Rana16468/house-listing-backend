import jwt, { JwtPayload } from 'jsonwebtoken';


const generateToken = (
  payload: { email?: string, role?: string, id?: string },
  secret: string,
  expiresIn: string | number = '1h' 
): string => {
  const options:{} = { expiresIn };
  return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string, secret: string): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};

const generateSubscriptionToken = (
  payload: { startDate?: string, endDate?: string, isActive?: string, isPaymentVerif?:string,paymentStatus?:string },
  secret: string,
  expiresIn: string | number = '1h' 
): string => {
  const options:{} = { expiresIn };
  return jwt.sign(payload, secret, options);
};

export const jwtHelpers = {
  generateToken,
  verifyToken,
  generateSubscriptionToken
};