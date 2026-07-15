export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    companyId: string;
    fullName: string;
  };
}
