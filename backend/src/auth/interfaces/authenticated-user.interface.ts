/**
 * Attached to request.user by JwtStrategy.validate().
 * Available in every guarded controller via @CurrentUser().
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  companyId: string | null;
  fullName: string;
}
