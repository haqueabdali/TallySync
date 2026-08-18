import { DataSource } from 'typeorm';

import { LicensedFeature } from '../../src/licensing/enums/licensed-feature.enum';

/**
 * Seeds an explicit all-feature ACTIVE license for an E2E company.
 *
 * This keeps commercial authorization fail-closed in production while allowing
 * business-flow E2Es to exercise the real LicenseFeatureGuard with a valid
 * entitlement instead of bypassing it.
 */
export async function ensureE2ECommercialLicense(
  dataSource: DataSource,
  companyId: string,
  actorUserId: string,
): Promise<string> {
  const existing = (await dataSource.query(
    `
      SELECT id
      FROM licenses
      WHERE company_id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [companyId],
  )) as Array<{ id: string }>;

  let licenseId = existing[0]?.id;

  if (licenseId) {
    await dataSource.query(
      `
        UPDATE licenses
        SET status = 'active',
            plan = 'enterprise',
            max_users = 5000,
            max_concurrent_users = 1000,
            valid_from = now() - interval '1 day',
            expires_at = now() + interval '1 year',
            minimum_version = NULL,
            maximum_version = NULL,
            updated_by = $2,
            updated_at = now()
        WHERE id = $1
      `,
      [licenseId, actorUserId],
    );
  } else {
    const inserted = (await dataSource.query(
      `
        INSERT INTO licenses (
          company_id,
          license_number,
          plan,
          status,
          max_users,
          max_concurrent_users,
          valid_from,
          expires_at,
          minimum_version,
          maximum_version,
          notes,
          created_by,
          updated_by
        )
        VALUES (
          $1,
          $2,
          'enterprise',
          'active',
          5000,
          1000,
          now() - interval '1 day',
          now() + interval '1 year',
          NULL,
          NULL,
          'E2E commercial entitlement',
          $3,
          $3
        )
        RETURNING id
      `,
      [companyId, `E2E-${companyId}`, actorUserId],
    )) as Array<{ id: string }>;

    licenseId = inserted[0]?.id;
  }

  if (!licenseId) {
    throw new Error('Failed to create E2E commercial license.');
  }

  for (const feature of Object.values(LicensedFeature)) {
    await dataSource.query(
      `
        INSERT INTO license_features (
          license_id,
          feature,
          enabled,
          feature_limit,
          config
        )
        VALUES ($1, $2, true, NULL, NULL)
        ON CONFLICT (license_id, feature)
        DO UPDATE SET
          enabled = true,
          updated_at = now()
      `,
      [licenseId, feature],
    );
  }

  return licenseId;
}
