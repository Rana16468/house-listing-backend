
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
    message = 'Invalid request data';
    errorSources = [
      {
        path: '',
        message: 'Please check the submitted information and try again.',
      },
    ];
  } else if (err instanceof PrismaClientKnownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;

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
            message: 'The requested record could not be found.',
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
        message = 'Unable to complete the request';
        errorSources = [
          {
            path: '',
            message: 'Please try again later.',
          },
        ];
      }
    }
  } else if (err instanceof PrismaClientInitializationError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Something went wrong';
    errorSources = [
      {
        path: '',
        message: 'Please try again later.',
      },
    ];
  } else if (err instanceof PrismaClientUnknownRequestError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Something went wrong';
    errorSources = [
      {
        path: '',
        message: 'Please try again later.',
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
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Something went wrong';
    errorSources = [
      {
        path: '',
        message: 'Please try again later.',
      },
    ];
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    err: null,
    stack: null,
  });
};

export default globalErrorHandler;