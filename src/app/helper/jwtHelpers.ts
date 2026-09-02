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

export const jwtHelpers = {
  generateToken,
  verifyToken,
};