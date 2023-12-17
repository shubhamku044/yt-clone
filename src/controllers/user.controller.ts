import { User } from '../models/user.model.js';
import { IRequestWithUser } from '../types/definitionFile.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

interface Tokens {
  accessToken: string | undefined;
  refreshToken: string | undefined;
}

const generateAccessAndRefreshToken = async (userId: string): Promise<Tokens> => {
  try {
    const user = await User.findById(userId);
    if (!user) return { accessToken: undefined, refreshToken: undefined };
    const accessToken = user?.generateAccessToken();
    const refreshToken = user?.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user?.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  }
  catch (err) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Something went wrong while generating token');
  }
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, fullname, avatar, password } = req.body;
  // const user = await User.create({
  //   username,
  //   email,
  //   fullname,
  //   avatar,
  //   password
  // });
  //
  // await user.save();

  const users = await User.find();
  res.status(StatusCodes.OK).json({
    message: 'ok, working',
    users: users
  });
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  if (!(username || email)) throw new ApiError(StatusCodes.BAD_REQUEST, 'user or email is required');

  const user = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) throw new ApiError(404, 'Invalid user credentials');

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  res
    .status(StatusCodes.OK)
    .cookie('accessToken', accessToken, { httpOnly: true, secure: true })
    .cookie('refreshToken', refreshToken, { httpOnly: true, secure: true })
    .json(
      new ApiResponse(
        StatusCodes.OK,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        'User logged in successfully'
      )
    );
});

const logoutUser = asyncHandler(async (req: IRequestWithUser, res: Response) => {
  await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  );
  res
    .status(StatusCodes.OK)
    .clearCookie('accessToken', { httpOnly: true, secure: true })
    .clearCookie('refreshToken', { httpOnly: true, secure: true })
    .json(new ApiResponse(
      StatusCodes.OK,
      {},
      'User logged out successfully'
    ));
});

export {
  registerUser,
  loginUser,
  logoutUser
};
