import { Schema, Types, model, Document, Model } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

interface IUserDocument extends Document {
  username: string;
  email: string;
  fullname: string;
  avatar: string;
  coverImage?: string;
  watchHistory: Types.ObjectId[];
  password: string;
  refreshToken?: string;
}

interface IUser extends IUserDocument {
  isPasswordCorrect: (password: string) => Promise<boolean>;
  generateAccessToken: () => string;
  generateRefreshToken: () => string;
}

interface IUserModel extends Model<IUser> { }

const userSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  },
  fullname: {
    type: String,
    unique: false,
    required: true,
    index: true
  },
  avatar: {
    type: String,
    required: true
  },
  coverImage: {
    type: String
  },
  watchHistory: [
    {
      type: Types.ObjectId,
      ref: 'Video'
    }
  ],
  password: {
    type: String,
    required: [true, 'Password is required']
  },
  refreshToken: {
    type: String
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function(password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function() {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET as string;
  const accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRY as string;
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname
    },
    accessTokenSecret,
    {
      expiresIn: accessTokenExpiresIn
    }
  );
};

userSchema.methods.generateRefreshToken = function() {
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;
  const refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRY as string;
  return jwt.sign(
    {
      _id: this._id,
    },
    refreshTokenSecret,
    {
      expiresIn: refreshTokenExpiresIn
    }
  );
};

export const User: IUserModel = model<IUser, IUserModel>('User', userSchema);
