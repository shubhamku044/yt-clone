import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { JwtPayloadWithUser, IRequestWithUser } from '../types/definitionFile.js';

const verifyJWT = asyncHandler(async (req: IRequestWithUser, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized token');
    const decodedToken: JwtPayloadWithUser =
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayloadWithUser;

    const user = await User.findById(decodedToken?._id).select('-password -refreshToken');

    req.user = user as {
      _id: string
      email: string
      username: string
      fullname: string
    };
    next();
  } catch (err) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid access token');
  }
});

export {
  verifyJWT
};
