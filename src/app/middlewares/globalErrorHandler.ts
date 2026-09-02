
import { ErrorRequestHandler } from 'express';
import httpStatus from 'http-status';
import { ZodError, ZodIssue } from 'zod';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
  PrismaClientInitializationError,
  PrismaClientUnknownRequestError,
} from '@prisma/client/runtime/library';
import { TErrorSources } from '../interface/error';
import AppError from '../errors/AppError';
import config from '../config';
import logError from './logError';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {

  logError(err, req);
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Something went wrong';
  let errorSources: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong',
    },
  ];

  if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Validation Error';
    errorSources = err.issues.map((issue: ZodIssue) => ({
      path: issue.path[issue.path.length - 1]?.toString() ?? '',
      message: issue.message,
    }));
  } else if (err instanceof PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = 'Validation Error';
    errorSources = [
      {
        path: '',
        message: err.message.split('\n').pop() || 'Prisma validation error',
      },
    ];
  } else if (err instanceof PrismaClientKnownRequestError) {
    statusCode = httpStatus.BAD_REQUEST;

    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field';
        message = 'Duplicate Entry';
        errorSources = [
          {
            path: target,
            message: `${target} already exists`,
          },
        ];
        break;
      }
      case 'P2025': {
        statusCode = httpStatus.NOT_FOUND;
        message = 'Record Not Found';
        errorSources = [
          {
            path: '',
            message: (err.meta?.cause as string) || 'The requested record does not exist',
          },
        ];
        break;
      }
      case 'P2003': {
        message = 'Invalid Reference';
        errorSources = [
          {
            path: (err.meta?.field_name as string) || '',
            message: 'Related record does not exist (foreign key constraint failed)',
          },
        ];
        break;
      }
      case 'P2014': {
        message = 'Invalid Relation';
        errorSources = [
          {
            path: '',
            message: 'The change violates a required relation between records',
          },
        ];
        break;
      }
      default: {
        message = 'Database Error';
        errorSources = [
          {
            path: '',
            message: err.message,
          },
        ];
      }
    }
  } else if (err instanceof PrismaClientInitializationError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Database Connection Error';
    errorSources = [
      {
        path: '',
        message: 'Failed to connect to the database',
      },
    ];
  } else if (err instanceof PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Unknown Database Error';
    errorSources = [
      {
        path: '',
        message: err.message,
      },
    ];
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;
    message = err?.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  } else if (err instanceof Error) {
    message = err?.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    err,
    stack: config.NODE_ENV === 'development' ? err?.stack : null,
  });
};

export default globalErrorHandler;