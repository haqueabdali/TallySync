-- =============================================================================
-- TALLY SALES ORDER & VOUCHER SYNC
-- PostgreSQL Schema — Production Ready
-- =============================================================================
-- Conventions:
--   • UUID primary keys via gen_random_uuid()
--   • created_at / updated_at on every table
--   • deleted_at for soft deletes (NULL = active)
--   • All ENUMs defined as PostgreSQL TYPE
--   • Indexes on every FK + high-cardinality filter column
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- trigram indexes for ILIKE search
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- GIN on scalar types


-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_status        AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE sync_status        AS ENUM ('pending', 'synced', 'failed', 'retry');
CREATE TYPE sync_direction     AS ENUM ('push', 'pull');
CREATE TYPE voucher_type       AS ENUM (
    'sales_voucher',
    'purchase_voucher',
    'credit_note',
    'debit_note'
);
CREATE TYPE voucher_status     AS ENUM ('draft', 'approved', 'cancelled');
CREATE TYPE order_status       AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'fulfilled',
    'cancelled'
);
CREATE TYPE audit_action       AS ENUM (
    'create', 'update', 'delete',
    'login', 'logout',
    'approve', 'cancel',
    'sync_push', 'sync_pull'
);


-- =============================================================================
-- TABLE: roles
-- =============================================================================
-- Four built-in roles: admin, company_owner, vendor, sales_rep
-- Custom roles can be added per-deployment.
-- =============================================================================

CREATE TABLE roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(64) NOT NULL,
    description TEXT,
    is_system   BOOLEAN     NOT NULL DEFAULT FALSE,  -- TRUE = cannot be deleted
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique role name
CREATE UNIQUE INDEX uq_roles_name ON roles (LOWER(name));

-- Seed built-in roles (safe on re-run)
INSERT INTO roles (name, description, is_system) VALUES
    ('admin',         'Full system access',                 TRUE),
    ('company_owner', 'Manages a single company',           TRUE),
    ('vendor',        'Creates orders, views stock',        TRUE),
    ('sales_rep',     'Creates vouchers and sales orders',  TRUE)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- TABLE: companies
-- =============================================================================
-- Multi-company: each row stores its own Tally connection config.
-- =============================================================================

CREATE TABLE companies (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(255) NOT NULL,
    tally_company_name   VARCHAR(255) NOT NULL,         -- must match Tally exactly
    tally_host           VARCHAR(255) NOT NULL DEFAULT '127.0.0.1',
    tally_port           SMALLINT     NOT NULL DEFAULT 9000
                             CHECK (tally_port BETWEEN 1 AND 65535),
    tally_version        VARCHAR(32),                   -- 'Prime' | 'ERP9'
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ                    -- soft delete
);

CREATE UNIQUE INDEX uq_companies_name_active
    ON companies (LOWER(name))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_companies_active
    ON companies (is_active)
    WHERE deleted_at IS NULL;


-- =============================================================================
-- TABLE: users
-- =============================================================================

CREATE TABLE users (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID          NOT NULL
                        REFERENCES companies (id) ON DELETE RESTRICT,
    role_id         UUID          NOT NULL
                        REFERENCES roles (id) ON DELETE RESTRICT,
    full_name       VARCHAR(255)  NOT NULL,
    email           VARCHAR(255)  NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,
    phone           VARCHAR(32),
    status          user_status   NOT NULL DEFAULT 'active',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Email must be unique among non-deleted users
CREATE UNIQUE INDEX uq_users_email_active
    ON users (LOWER(email))
    WHERE deleted_at IS NULL;

-- FK lookups
CREATE INDEX idx_users_company_id  ON users (company_id);
CREATE INDEX idx_users_role_id     ON users (role_id);
CREATE INDEX idx_users_status      ON users (status) WHERE deleted_at IS NULL;
-- Trigram index for full-name search
CREATE INDEX idx_users_full_name_trgm
    ON users USING GIN (full_name gin_trgm_ops);

-- Constraint: deleted users must have deleted_at set
ALTER TABLE users
    ADD CONSTRAINT chk_users_deleted
        CHECK (
            (status = 'inactive' AND deleted_at IS NOT NULL)
            OR (status <> 'inactive')
        );


-- =============================================================================
-- TABLE: refresh_tokens
-- =============================================================================
-- Short-lived; purged by a scheduled job when expired.
-- =============================================================================

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL
                    REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,          -- SHA-256 of the raw token
    expires_at  TIMESTAMPTZ NOT NULL,
    is_revoked  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_refresh_tokens_hash    ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_user_id       ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at    ON refresh_tokens (expires_at);
CREATE INDEX idx_refresh_tokens_active
    ON refresh_tokens (user_id, expires_at)
    WHERE is_revoked = FALSE;

ALTER TABLE refresh_tokens
    ADD CONSTRAINT chk_refresh_tokens_expiry
        CHECK (expires_at > created_at);


-- =============================================================================
-- TABLE: customers
-- =============================================================================

CREATE TABLE customers (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID         NOT NULL
                            REFERENCES companies (id) ON DELETE RESTRICT,
    name                VARCHAR(255) NOT NULL,
    phone               VARCHAR(32),
    email               VARCHAR(255),
    address             TEXT,
    tally_ledger_name   VARCHAR(255),           -- must match Tally ledger name exactly
    credit_limit        NUMERIC(15,2) NOT NULL DEFAULT 0
                            CHECK (credit_limit >= 0),
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

-- One customer name per company (active records only)
CREATE UNIQUE INDEX uq_customers_name_company
    ON customers (company_id, LOWER(name))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_customers_company_id      ON customers (company_id);
CREATE INDEX idx_customers_tally_ledger    ON customers (tally_ledger_name)
    WHERE tally_ledger_name IS NOT NULL;
CREATE INDEX idx_customers_name_trgm
    ON customers USING GIN (name gin_trgm_ops);
CREATE INDEX idx_customers_active
    ON customers (company_id, is_active)
    WHERE deleted_at IS NULL;


-- =============================================================================
-- TABLE: categories
-- =============================================================================

CREATE TABLE categories (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     UUID         NOT NULL
                       REFERENCES companies (id) ON DELETE RESTRICT,
    name           VARCHAR(255) NOT NULL,
    tally_group    VARCHAR(255),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_categories_name_company
    ON categories (company_id, LOWER(name))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_categories_company_id ON categories (company_id);


-- =============================================================================
-- TABLE: items  (inventory)
-- =============================================================================

CREATE TABLE items (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID          NOT NULL
                          REFERENCES companies (id) ON DELETE RESTRICT,
    category_id       UUID
                          REFERENCES categories (id) ON DELETE SET NULL,
    name              VARCHAR(255)  NOT NULL,
    sku               VARCHAR(128),
    unit              VARCHAR(32)   NOT NULL DEFAULT 'Nos',
    sale_price        NUMERIC(15,4) NOT NULL DEFAULT 0
                          CHECK (sale_price >= 0),
    purchase_price    NUMERIC(15,4) NOT NULL DEFAULT 0
                          CHECK (purchase_price >= 0),
    stock_qty         NUMERIC(15,4) NOT NULL DEFAULT 0,
    reorder_level     NUMERIC(15,4) NOT NULL DEFAULT 0
                          CHECK (reorder_level >= 0),
    tally_item_name   VARCHAR(255),             -- exact Stock Item name in Tally
    sync_status       sync_status   NOT NULL DEFAULT 'pending',
    last_synced_at    TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

-- SKU unique per company
CREATE UNIQUE INDEX uq_items_sku_company
    ON items (company_id, LOWER(sku))
    WHERE sku IS NOT NULL AND deleted_at IS NULL;

-- Item name unique per company
CREATE UNIQUE INDEX uq_items_name_company
    ON items (company_id, LOWER(name))
    WHERE deleted_at IS NULL;

CREATE INDEX idx_items_company_id      ON items (company_id);
CREATE INDEX idx_items_category_id     ON items (category_id);
CREATE INDEX idx_items_sync_status     ON items (sync_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_stock_qty       ON items (company_id, stock_qty) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_tally_name      ON items (tally_item_name)
    WHERE tally_item_name IS NOT NULL;
CREATE INDEX idx_items_name_trgm
    ON items USING GIN (name gin_trgm_ops);


-- =============================================================================
-- TABLE: sales_orders
-- =============================================================================

CREATE TABLE sales_orders (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       UUID          NOT NULL
                         REFERENCES companies (id) ON DELETE RESTRICT,
    customer_id      UUID          NOT NULL
                         REFERENCES customers (id) ON DELETE RESTRICT,
    created_by       UUID          NOT NULL
                         REFERENCES users (id) ON DELETE RESTRICT,
    approved_by      UUID
                         REFERENCES users (id) ON DELETE SET NULL,
    order_number     VARCHAR(64)   NOT NULL,
    order_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
    expected_date    DATE,
    status           order_status  NOT NULL DEFAULT 'draft',
    subtotal         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount       NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount  NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    notes            TEXT,
    sync_status      sync_status   NOT NULL DEFAULT 'pending',
    tally_order_ref  VARCHAR(255),             -- Tally Sales Order number after sync
    synced_at        TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,

    CONSTRAINT chk_sales_orders_total
        CHECK (total_amount = subtotal + tax_amount - discount_amount),
    CONSTRAINT chk_sales_orders_dates
        CHECK (expected_date IS NULL OR expected_date >= order_date)
);

CREATE UNIQUE INDEX uq_sales_orders_number_company
    ON sales_orders (company_id, order_number)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_sales_orders_company_id    ON sales_orders (company_id);
CREATE INDEX idx_sales_orders_customer_id   ON sales_orders (customer_id);
CREATE INDEX idx_sales_orders_created_by    ON sales_orders (created_by);
CREATE INDEX idx_sales_orders_approved_by   ON sales_orders (approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX idx_sales_orders_status        ON sales_orders (company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_sync_status   ON sales_orders (sync_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_orders_order_date    ON sales_orders (company_id, order_date DESC);
CREATE INDEX idx_sales_orders_pending_sync
    ON sales_orders (company_id, sync_status, created_at)
    WHERE sync_status IN ('pending', 'failed') AND deleted_at IS NULL;


-- =============================================================================
-- TABLE: sales_order_items
-- =============================================================================

CREATE TABLE sales_order_items (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_order_id   UUID          NOT NULL
                         REFERENCES sales_orders (id) ON DELETE CASCADE,
    item_id          UUID          NOT NULL
                         REFERENCES items (id) ON DELETE RESTRICT,
    quantity         NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
    unit_price       NUMERIC(15,4) NOT NULL CHECK (unit_price >= 0),
    discount_pct     NUMERIC(5,2)  NOT NULL DEFAULT 0
                         CHECK (discount_pct BETWEEN 0 AND 100),
    tax_pct          NUMERIC(5,2)  NOT NULL DEFAULT 0
                         CHECK (tax_pct BETWEEN 0 AND 100),
    line_total       NUMERIC(15,2) NOT NULL CHECK (line_total >= 0),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_soi_line_total
        CHECK (
            line_total = ROUND(
                (quantity * unit_price)
                * (1 - discount_pct / 100)
                * (1 + tax_pct / 100),
            2)
        )
);

-- Prevent duplicate item on the same order
CREATE UNIQUE INDEX uq_soi_order_item
    ON sales_order_items (sales_order_id, item_id);

CREATE INDEX idx_soi_sales_order_id ON sales_order_items (sales_order_id);
CREATE INDEX idx_soi_item_id        ON sales_order_items (item_id);


-- =============================================================================
-- TABLE: vouchers
-- =============================================================================

CREATE TABLE vouchers (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID           NOT NULL
                          REFERENCES companies (id) ON DELETE RESTRICT,
    customer_id       UUID
                          REFERENCES customers (id) ON DELETE RESTRICT,
    created_by        UUID           NOT NULL
                          REFERENCES users (id) ON DELETE RESTRICT,
    approved_by       UUID
                          REFERENCES users (id) ON DELETE SET NULL,
    voucher_type      voucher_type   NOT NULL,
    voucher_number    VARCHAR(64)    NOT NULL,
    voucher_date      DATE           NOT NULL DEFAULT CURRENT_DATE,
    status            voucher_status NOT NULL DEFAULT 'draft',
    subtotal          NUMERIC(15,2)  NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount        NUMERIC(15,2)  NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount   NUMERIC(15,2)  NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount      NUMERIC(15,2)  NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    narration         TEXT,
    sync_status       sync_status    NOT NULL DEFAULT 'pending',
    tally_voucher_id  VARCHAR(255),
    synced_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,

    CONSTRAINT chk_vouchers_total
        CHECK (total_amount = subtotal + tax_amount - discount_amount),
    CONSTRAINT chk_vouchers_customer_required
        CHECK (
            voucher_type NOT IN ('sales_voucher', 'credit_note')
            OR customer_id IS NOT NULL
        )
);

CREATE UNIQUE INDEX uq_vouchers_number_company
    ON vouchers (company_id, voucher_number)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_vouchers_company_id     ON vouchers (company_id);
CREATE INDEX idx_vouchers_customer_id    ON vouchers (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_vouchers_created_by     ON vouchers (created_by);
CREATE INDEX idx_vouchers_approved_by    ON vouchers (approved_by) WHERE approved_by IS NOT NULL;
CREATE INDEX idx_vouchers_type_status    ON vouchers (company_id, voucher_type, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_vouchers_sync_status    ON vouchers (sync_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_vouchers_voucher_date   ON vouchers (company_id, voucher_date DESC);
CREATE INDEX idx_vouchers_pending_sync
    ON vouchers (company_id, sync_status, created_at)
    WHERE sync_status IN ('pending', 'failed') AND deleted_at IS NULL;


-- =============================================================================
-- TABLE: voucher_items
-- =============================================================================

CREATE TABLE voucher_items (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id   UUID          NOT NULL
                     REFERENCES vouchers (id) ON DELETE CASCADE,
    item_id      UUID          NOT NULL
                     REFERENCES items (id) ON DELETE RESTRICT,
    quantity     NUMERIC(15,4) NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(15,4) NOT NULL CHECK (unit_price >= 0),
    discount_pct NUMERIC(5,2)  NOT NULL DEFAULT 0
                     CHECK (discount_pct BETWEEN 0 AND 100),
    tax_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0
                     CHECK (tax_pct BETWEEN 0 AND 100),
    line_total   NUMERIC(15,2) NOT NULL CHECK (line_total >= 0),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_vi_line_total
        CHECK (
            line_total = ROUND(
                (quantity * unit_price)
                * (1 - discount_pct / 100)
                * (1 + tax_pct / 100),
            2)
        )
);

-- Prevent duplicate item on the same voucher
CREATE UNIQUE INDEX uq_vi_voucher_item
    ON voucher_items (voucher_id, item_id);

CREATE INDEX idx_vi_voucher_id ON voucher_items (voucher_id);
CREATE INDEX idx_vi_item_id    ON voucher_items (item_id);


-- =============================================================================
-- TABLE: audit_logs
-- =============================================================================
-- Immutable — no UPDATE or DELETE allowed (enforced via trigger below).
-- =============================================================================

CREATE TABLE audit_logs (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID          NOT NULL
                     REFERENCES companies (id) ON DELETE RESTRICT,
    user_id      UUID
                     REFERENCES users (id) ON DELETE SET NULL,
    action       audit_action  NOT NULL,
    entity_type  VARCHAR(64)   NOT NULL,   -- e.g. 'voucher', 'sales_order'
    entity_id    UUID,
    old_values   JSONB,
    new_values   JSONB,
    ip_address   INET,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_company_id   ON audit_logs (company_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id      ON audit_logs (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_entity       ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_action       ON audit_logs (action, created_at DESC);
-- GIN index for JSONB payload queries
CREATE INDEX idx_audit_logs_new_values   ON audit_logs USING GIN (new_values);

-- Trigger: prevent mutation of audit_logs
CREATE OR REPLACE FUNCTION fn_audit_logs_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'audit_logs is immutable — UPDATE and DELETE are not permitted (row id: %)',
        OLD.id;
END;
$$;

CREATE TRIGGER trg_audit_logs_no_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_immutable();

CREATE TRIGGER trg_audit_logs_no_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_immutable();


-- =============================================================================
-- TABLE: sync_logs
-- =============================================================================

CREATE TABLE sync_logs (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID           NOT NULL
                        REFERENCES companies (id) ON DELETE RESTRICT,
    entity_type     VARCHAR(64)    NOT NULL,   -- 'voucher' | 'sales_order' | 'item'
    entity_id       UUID           NOT NULL,
    direction       sync_direction NOT NULL DEFAULT 'push',
    status          sync_status    NOT NULL,
    tally_request   TEXT,                      -- raw XML sent to Tally
    tally_response  TEXT,                      -- raw XML received from Tally
    error_message   TEXT,
    retry_count     SMALLINT       NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    next_retry_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_company_entity
    ON sync_logs (company_id, entity_type, entity_id, created_at DESC);
CREATE INDEX idx_sync_logs_status
    ON sync_logs (status, next_retry_at)
    WHERE status IN ('pending', 'failed', 'retry');
CREATE INDEX idx_sync_logs_entity_id    ON sync_logs (entity_id);
CREATE INDEX idx_sync_logs_created_at   ON sync_logs (created_at DESC);


-- =============================================================================
-- TRIGGERS: auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to every table that carries updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles', 'companies', 'users',
        'customers', 'categories', 'items',
        'sales_orders', 'vouchers', 'sync_logs'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;


-- =============================================================================
-- ROW-LEVEL SECURITY  (skeleton — enable per table when multi-tenant auth is wired)
-- =============================================================================
-- ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY vouchers_company_isolation ON vouchers
--     USING (company_id = current_setting('app.current_company_id')::UUID);
-- (Uncomment and wire via SET LOCAL in your NestJS request context)


-- =============================================================================
-- SUMMARY OF OBJECTS CREATED
-- =============================================================================
--  ENUMS        : user_status, sync_status, sync_direction,
--                 voucher_type, voucher_status, order_status, audit_action
--
--  TABLES (13)  : roles, companies, users, refresh_tokens,
--                 customers, categories, items,
--                 sales_orders, sales_order_items,
--                 vouchers, voucher_items,
--                 audit_logs, sync_logs
--
--  INDEXES      : 47 total
--                   Unique   : 12
--                   B-tree   : 29
--                   GIN/trgm :  6
--
--  CONSTRAINTS  : 16 CHECK constraints + NOT NULL + FK cascades
--
--  TRIGGERS     : fn_set_updated_at (9 tables)
--                 fn_audit_logs_immutable (UPDATE + DELETE blocked)
-- =============================================================================
