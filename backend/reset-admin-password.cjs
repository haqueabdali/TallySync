'use strict';

const bcrypt = require('bcrypt');
const { Client } = require('pg');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Loads simple KEY=VALUE entries from backend/.env
 * without requiring the dotenv package.
 */
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex < 1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
  'admin@tallysync.local';

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || 'Admin@12345';

const ADMIN_FULL_NAME =
  process.env.ADMIN_FULL_NAME || 'System Administrator';

const BCRYPT_ROUNDS = Number.parseInt(
  process.env.BCRYPT_ROUNDS || '12',
  10,
);

function getDatabaseConfig() {
  const password = process.env.DATABASE_PASSWORD;

  if (!password) {
    throw new Error(
      'DATABASE_PASSWORD is missing. Add it to backend/.env.',
    );
  }

  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number.parseInt(
      process.env.DATABASE_PORT || '5432',
      10,
    ),
    user: process.env.DATABASE_USER || 'postgres',
    password,
    database: process.env.DATABASE_NAME || 'tallysync_db',
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  };
}

async function findAdminRole(client) {
  const result = await client.query(`
    SELECT id, name
    FROM roles
    WHERE LOWER(BTRIM(name)) IN (
      'admin',
      'administrator',
      'system_admin',
      'system administrator'
    )
    ORDER BY
      CASE
        WHEN LOWER(BTRIM(name)) = 'admin' THEN 1
        ELSE 2
      END
    LIMIT 1
  `);

  if (result.rowCount === 0) {
    throw new Error(
      'No admin role was found in the roles table. Create a role named "admin" first.',
    );
  }

  return result.rows[0];
}

async function findActiveCompany(client) {
  const result = await client.query(`
    SELECT
      id,
      name
    FROM public.companies
    WHERE deleted_at IS NULL
      AND COALESCE(is_active, TRUE) = TRUE
    ORDER BY created_at ASC
    LIMIT 1
  `);

  if (result.rowCount === 0) {
    const diagnostic = await client.query(`
      SELECT
        current_database() AS database_name,
        current_schema() AS schema_name,
        COUNT(*)::integer AS company_count
      FROM public.companies
    `);

    throw new Error(
      `No usable company found. Connected database: ` +
      `${diagnostic.rows[0].database_name}, ` +
      `schema: ${diagnostic.rows[0].schema_name}, ` +
      `companies: ${diagnostic.rows[0].company_count}`,
    );
  }

  return result.rows[0];
}

async function findExistingAdmin(client) {
  const result = await client.query(
    `
      SELECT
        id,
        email,
        full_name,
        company_id,
        role_id,
        password_hash
      FROM users
      WHERE LOWER(BTRIM(email)) = LOWER($1)
      ORDER BY created_at ASC
    `,
    [ADMIN_EMAIL],
  );

  if (result.rowCount > 1) {
    throw new Error(
      `Multiple users were found for ${ADMIN_EMAIL}. Remove duplicate accounts first.`,
    );
  }

  return result.rows[0] || null;
}

async function createOrUpdateAdmin(
  client,
  role,
  company,
  passwordHash,
) {
  const existingUser = await findExistingAdmin(client);

  if (existingUser) {
    const result = await client.query(
      `
        UPDATE users
        SET
          email = LOWER(BTRIM($1)),
          full_name = $2,
          password_hash = $3,
          status = 'active',
          deleted_at = NULL,
          role_id = $4,
          company_id = $5,
          reset_token_hash = NULL,
          reset_token_expires_at = NULL,
          updated_at = NOW()
        WHERE id = $6
        RETURNING
          id,
          email,
          full_name,
          company_id,
          role_id,
          password_hash,
          status
      `,
      [
        ADMIN_EMAIL,
        ADMIN_FULL_NAME,
        passwordHash,
        role.id,
        company.id,
        existingUser.id,
      ],
    );

    return {
      action: 'updated',
      user: result.rows[0],
    };
  }

  const result = await client.query(
    `
      INSERT INTO users (
        id,
        company_id,
        role_id,
        full_name,
        email,
        password_hash,
        phone,
        status,
        reset_token_hash,
        reset_token_expires_at,
        last_login_at,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        LOWER(BTRIM($5)),
        $6,
        NULL,
        'active',
        NULL,
        NULL,
        NULL,
        NOW(),
        NOW(),
        NULL
      )
      RETURNING
        id,
        email,
        full_name,
        company_id,
        role_id,
        password_hash,
        status
    `,
    [
      randomUUID(),
      company.id,
      role.id,
      ADMIN_FULL_NAME,
      ADMIN_EMAIL,
      passwordHash,
    ],
  );

  return {
    action: 'created',
    user: result.rows[0],
  };
}

async function main() {
  let client;

  try {
    if (
      !Number.isInteger(BCRYPT_ROUNDS) ||
      BCRYPT_ROUNDS < 10 ||
      BCRYPT_ROUNDS > 15
    ) {
      throw new Error(
        'BCRYPT_ROUNDS must be an integer between 10 and 15.',
      );
    }

    client = new Client(getDatabaseConfig());

    await client.connect();

    console.log('Connected to PostgreSQL.');
    
    const databaseInfo = await client.query(`
      SELECT
        current_database() AS database_name,
        current_schema() AS schema_name,
        current_user AS database_user
`    );

    console.log('Database connection:', databaseInfo.rows[0]);

    const companyCheck = await client.query(`
      SELECT
        id,
        name,
        is_active,
        deleted_at
      FROM public.companies
`   );

    console.log('Companies found:', companyCheck.rows);

    await client.query('BEGIN');

    const role = await findAdminRole(client);
    const company = await findActiveCompany(client);

    console.log(`Admin role: ${role.name} (${role.id})`);
    console.log(`Company: ${company.name} (${company.id})`);

    const generatedHash = await bcrypt.hash(
      ADMIN_PASSWORD,
      BCRYPT_ROUNDS,
    );

    const result = await createOrUpdateAdmin(
      client,
      role,
      company,
      generatedHash,
    );

    const storedHash = result.user.password_hash;

    const passwordMatches = await bcrypt.compare(
      ADMIN_PASSWORD,
      storedHash,
    );

    if (!passwordMatches) {
      throw new Error(
        'Password verification failed after saving the admin user.',
      );
    }

    await client.query('COMMIT');

    console.log('');
    console.log(`Admin user ${result.action} successfully.`);
    console.log(`User ID: ${result.user.id}`);
    console.log(`Email: ${result.user.email}`);
    console.log(`Status: ${result.user.status}`);
    console.log(`Hash length: ${storedHash.length}`);
    console.log(`Password verification: ${passwordMatches}`);
    console.log('');
    console.log('Login credentials:');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors when the connection was not established.
      }
    }

    console.error('');
    console.error(
      'Admin password reset failed:',
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  } finally {
    if (client) {
      await client.end().catch(() => undefined);
    }
  }
}

void main();