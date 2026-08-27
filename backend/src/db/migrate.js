require('dotenv').config();
const pool = require('./pool');

const SCHEMA_SQL = `
DO $$ BEGIN
  CREATE TYPE policy_status AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE policy_type AS ENUM ('Motor', 'Health', 'Travel', 'Property', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE claim_type AS ENUM ('Motor', 'Health', 'Travel', 'Property', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE claim_status AS ENUM (
    'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  full_name     VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS policies (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number VARCHAR(50)   NOT NULL UNIQUE,
  customer_name VARCHAR(255)  NOT NULL,
  policy_type   policy_type   NOT NULL,
  status        policy_status NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON policies (policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_customer_name ON policies (customer_name);

CREATE TABLE IF NOT EXISTS claims (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number  VARCHAR(50)   NOT NULL UNIQUE,
  policy_id     UUID          NOT NULL REFERENCES policies(id) ON DELETE RESTRICT,
  claim_type    claim_type    NOT NULL,
  amount        NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  incident_date DATE          NOT NULL,
  description   TEXT          NOT NULL,
  status        claim_status  NOT NULL DEFAULT 'SUBMITTED',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_claim_number   ON claims (claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id      ON claims (policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_status         ON claims (status);
CREATE INDEX IF NOT EXISTS idx_claims_claim_type     ON claims (claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_incident_date  ON claims (incident_date);
CREATE INDEX IF NOT EXISTS idx_claims_status_created ON claims (status, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_policies_updated_at ON policies;
CREATE TRIGGER trg_policies_updated_at
  BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_claims_updated_at ON claims;
CREATE TRIGGER trg_claims_updated_at
  BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations…');
    await client.query(SCHEMA_SQL);
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
