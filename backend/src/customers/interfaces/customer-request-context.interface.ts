export interface CustomerRequestContext {
  actorId: string | null;
  companyId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
