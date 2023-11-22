import { Request, Response, NextFunction } from 'express';

// eslint-disable-next-line no-unused-vars
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

const asyncHandler = (requestHandler: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise
    .resolve(requestHandler(req, res, next))
    .catch((err) => next(err));
};

export { asyncHandler };
