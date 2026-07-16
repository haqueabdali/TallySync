/** Returned on successful login or token refresh */
export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until accessToken expires
  tokenType: 'Bearer';
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    companyId: string | null;
  };
}

/** Generic message response for operations that have no payload */
export class MessageResponseDto {
  message: string;
}
