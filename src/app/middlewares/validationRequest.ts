import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import catchAsync from "../utils/asyncCatch";

const validationRequest = (schema: ZodTypeAny) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        // Validation checking 
        await schema.parseAsync({
            body: req.body,
            cookies: req.cookies,
            query: req.query,
            params: req.params
        });
        next();
    });
};

export default validationRequest;