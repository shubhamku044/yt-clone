import type { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

interface IUser {
  _id: string
  email: string
  username: string
  fullname: string
}

export type JwtPayloadWithUser = IUser | JwtPayload;

export interface IRequestWithUser extends Request {
  user?: {
    _id: string
    email: string
    username: string
    fullname: string
  }
}
