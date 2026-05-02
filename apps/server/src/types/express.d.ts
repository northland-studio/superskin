import { Request } from 'express';

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      avatar?: string;
      emailVerified?: boolean;
    }
    interface Request {
      user?: User;
    }
  }
}

export interface RequestWithUser extends Request {
  user: Express.User;
}
