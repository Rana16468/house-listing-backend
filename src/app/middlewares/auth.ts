import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import config from '../config';
import { prisma } from '../../prisma';
import catchAsync from '../utils/asyncCatch';
import AppError from '../errors/AppError';


export interface AuthUser {
  id: string;
  role: Role;
  phone: string;
}



 const auth = (...requiredRoles: Role[]) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
   
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      throw  new AppError(httpStatus.UNAUTHORIZED, 'Access token missing');
    }

    // 2. Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt_access_secret as string) as JwtPayload;
    } catch {
      
      throw new AppError(httpStatus.NOT_FOUND, 'Invalid or expired token');
    }

    // 3. Database query
    const user = await prisma.user.findUnique({
      where: { id: String(decoded.id) },
      select: { id: true, role: true, phone: true },
    });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'User no longer exists');
    }

    // 4. Role Authorization Check
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw  new AppError(httpStatus.FORBIDDEN, 'You do not have permission for this action');
    }

    // 5. Attach verified user payload to express request
    req.user = { id: user.id, role: user.role, phone: user.phone };
    
    next();
  });

export default auth;