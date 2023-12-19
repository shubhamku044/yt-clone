import { User } from '../models/user.model.js';
import {
  IRequestWithMulterFiles,
  IRequestWithUser,
  JwtPayloadWithUser
} from '../types/definitionFile.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';
import { uploadToCloudinary } from '../utils/cloudinary.js';

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
  const { username, email, fullname, password } = req.body;

  if ([fullname, email, username, password].some((field: string) => field?.trim() === ''))
    throw new ApiError(StatusCodes.BAD_REQUEST, 'All fields are required');

  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (existingUser) throw new ApiError(StatusCodes.CONFLICT, 'User with email or username already exists');

  const avatarFiles = (req as IRequestWithMulterFiles).files!.avatar;
  const coverImageFiles = (req as IRequestWithMulterFiles).files!.coverImage;
  let avatarLocalPath = undefined;
  let coverImgLocalPath = undefined;

  if (avatarFiles && avatarFiles.length > 0 && avatarFiles[0].path)
    avatarLocalPath = avatarFiles[0].path;
  else
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Avatar file is required');

  if (coverImageFiles && coverImageFiles.length > 0 && coverImageFiles[0].path)
    coverImgLocalPath = coverImageFiles[0].path;

  if (!avatarLocalPath) throw new ApiError(StatusCodes.BAD_REQUEST, 'Avatar file is required');

  const avatar = await uploadToCloudinary(avatarLocalPath);

  let coverImg;
  if (coverImgLocalPath)
    coverImg = await uploadToCloudinary(coverImgLocalPath);

  if (!avatar) throw new ApiError(StatusCodes.BAD_REQUEST, 'Avatar file is required');

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullname,
    password,
    avatar: avatar.url,
    coverImage: coverImg ? coverImg?.url : ''
  });

  const createdUser = await User.findById(user._id).select('-password -refreshToken');

  if (!createdUser)
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Something went wrong while registering user');

  res
    .status(StatusCodes.CREATED)
    .json(new ApiResponse(
      StatusCodes.OK,
      createdUser,
      'User created successfully'
    ));
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

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized user');

  try {
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;
    const decodedToken: JwtPayloadWithUser = jwt.verify(incomingRefreshToken, refreshTokenSecret) as JwtPayloadWithUser;

    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token');

    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token is expired or used');

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id);

    res
      .status(StatusCodes.OK)
      .cookie('accessToken', accessToken)
      .cookie('refreshToken', newRefreshToken)
      .json(
        new ApiResponse(
          StatusCodes.OK,
          {
            accessToken,
            refreshToken: newRefreshToken
          },
          'Access token refreshed'
        )
      );
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token.');
  }
});

const changeCurrentPassword = asyncHandler(async (req: IRequestWithUser, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user?.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid old password');
  if (!user) throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Internal server error');
  user.password = newPassword;
  await user?.save({ validateBeforeSave: false });

  res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(200, {}, 'Password change successfully')
    );
});

const getCurrentUser = asyncHandler(async (req: IRequestWithUser, res: Response) => {
  res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(200, req.user, 'current user fetched successfully')
    );
});

const updateUserDetails = asyncHandler(async (req: IRequestWithUser, res: Response) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) throw new ApiError(StatusCodes.BAD_REQUEST, 'All feilds are required');

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email
      }
    },
    { new: true }
  ).select('-password');

  res
    .status(StatusCodes.OK)
    .json(
      new ApiResponse(StatusCodes.OK, user, 'Account details')
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails
};
