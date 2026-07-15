/**
 * Shape of the JWT access token payload.
 * Keep this small — it's included in every authenticated request.
 */
export interface JwtPayload {
  /** Subject — user UUID */
  sub: string;
  email: string;
  role: string;
  companyId: string | null;
  /** Issued-at (Unix timestamp, set automatically by JwtService) */
  iat?: number;
  /** Expiration (Unix timestamp) */
  exp?: number;
  /** Issuer */
  iss?: string;
}
