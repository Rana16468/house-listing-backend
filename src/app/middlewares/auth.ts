import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Role, Status } from '@prisma/client';
import config from '../config';
import { prisma } from '../../prisma';
import catchAsync from '../utils/asyncCatch';
import AppError from '../errors/AppError';
import { getCache, setCache } from '../redis/redis';

const AUTH_USER_CACHE_TTL = 30;
const authUserCacheKey = (userId: string) => `auth:user:${userId}`;

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
}

const auth = (...requiredRoles: Role[]) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization?.trim();

    if (!authHeader) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Access token missing');
    }

    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = (bearerMatch ? bearerMatch[1] : authHeader).trim();
    const tokenParts = token.split('.');

    if (tokenParts.length !== 3 || tokenParts.some((part) => part.length === 0)) {
      console.error('Invalid access token received:', {
        tokenLength: token.length,
        tokenPartCount: tokenParts.length,
        hasTruncationMarker: token.includes('...'),
      });
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid access token format');
    }

    if (!config.jwt_access_secret) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'JWT access secret is not configured');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt_access_secret) as JwtPayload;
    } catch (err) {
      console.error('JWT verification failed:', err instanceof Error ? err.message : err);
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired token');
    }

    if (typeof decoded.id !== 'string' || decoded.id.length === 0) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid access token payload');
    }

    const userId = String(decoded.id);
    let user = await getCache(authUserCacheKey(userId));

    if (user === null) {
      user = await prisma.user.findUnique({
        where: { id: userId, isDeleted: false, status: Status.ACTIVE, isVerify: true },
        select: { id: true, role: true, phone: true },
      });

      if (user) {
        await setCache(authUserCacheKey(userId), user, AUTH_USER_CACHE_TTL);
      }
    }

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'User no longer exists');
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission for this action');
    }

    req.user = { id: user.id, role: user.role, phone: user.phone };

    next();
  });

export default auth;