/**
 * Metadata extracted from the HTTP request and forwarded
 * into service methods for audit logging.
 */
export interface RequestContext {
  /** UUID of the authenticated user performing the action */
  actorId: string;
  /** Company of the authenticated user */
  actorCompanyId: string;
  /** Original client IP (may be behind a proxy) */
  ipAddress: string | null;
  /** Browser / client user-agent string */
  userAgent: string | null;
}
