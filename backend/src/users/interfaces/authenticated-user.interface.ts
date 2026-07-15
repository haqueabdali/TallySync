/**
 * Shape attached to request.user by the JWT strategy.
 * Mirrors AuthenticatedUser from the auth module — kept here
 * so the users module has no hard import dependency on auth.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  companyId: string;
  fullName: string;
}
