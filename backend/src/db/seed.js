require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

const TEST_USER = {
  email:     'officer@jubilee.co.ke',
  full_name: 'Claims Officer',
  password:  'Claims@2026',
};

const policies = [
  { policy_number: 'POL-2026-001', customer_name: 'Jane Doe',       policy_type: 'Motor',    status: 'ACTIVE'  },
  { policy_number: 'POL-2026-002', customer_name: 'John Kamau',     policy_type: 'Health',   status: 'ACTIVE'  },
  { policy_number: 'POL-2026-003', customer_name: 'Amina Hassan',   policy_type: 'Travel',   status: 'ACTIVE'  },
  { policy_number: 'POL-2026-004', customer_name: 'Peter Njoroge',  policy_type: 'Property', status: 'ACTIVE'  },
  { policy_number: 'POL-2025-005', customer_name: 'Grace Wanjiku',  policy_type: 'Motor',    status: 'EXPIRED' },
  { policy_number: 'POL-2026-006', customer_name: 'David Ochieng',  policy_type: 'Health',   status: 'ACTIVE'  },
  { policy_number: 'POL-2026-007', customer_name: 'Sarah Mutua',    policy_type: 'Other',    status: 'ACTIVE'  },
  { policy_number: 'POL-2026-008', customer_name: 'Brian Kipchoge', policy_type: 'Property', status: 'ACTIVE'  },
];

const claimTemplates = [
  { claim_number: 'CLM-2026-0001', policy_number: 'POL-2026-001', claim_type: 'Motor',    amount: 250000,  incident_date: '2026-08-15', description: 'Vehicle damage following a rear-end collision on Thika Road.',               status: 'SUBMITTED'    },
  { claim_number: 'CLM-2026-0002', policy_number: 'POL-2026-002', claim_type: 'Health',   amount: 85000,   incident_date: '2026-08-10', description: 'Hospitalisation due to acute appendicitis requiring emergency surgery.',       status: 'UNDER_REVIEW' },
  { claim_number: 'CLM-2026-0003', policy_number: 'POL-2026-003', claim_type: 'Travel',   amount: 45000,   incident_date: '2026-07-22', description: 'Lost baggage claim — luggage not delivered after international flight.',       status: 'APPROVED'     },
  { claim_number: 'CLM-2026-0004', policy_number: 'POL-2026-004', claim_type: 'Property', amount: 1200000, incident_date: '2026-08-01', description: 'Structural damage to residential property caused by flooding.',                status: 'PAID'         },
  { claim_number: 'CLM-2026-0005', policy_number: 'POL-2025-005', claim_type: 'Motor',    amount: 175000,  incident_date: '2026-08-18', description: 'Windscreen and front bumper damage from hailstorm.',                          status: 'REJECTED'     },
  { claim_number: 'CLM-2026-0006', policy_number: 'POL-2026-006', claim_type: 'Health',   amount: 32000,   incident_date: '2026-08-20', description: 'Outpatient consultation and laboratory tests for diabetes management.',        status: 'SUBMITTED'    },
  { claim_number: 'CLM-2026-0007', policy_number: 'POL-2026-007', claim_type: 'Other',    amount: 18000,   incident_date: '2026-08-05', description: 'Personal liability claim — third-party injury on insured premises.',          status: 'UNDER_REVIEW' },
  { claim_number: 'CLM-2026-0008', policy_number: 'POL-2026-008', claim_type: 'Property', amount: 560000,  incident_date: '2026-08-12', description: 'Fire damage to commercial warehouse — partial loss of stock and structure.',   status: 'UNDER_REVIEW' },
  { claim_number: 'CLM-2026-0009', policy_number: 'POL-2026-001', claim_type: 'Motor',    amount: 95000,   incident_date: '2026-08-22', description: 'Third-party property damage caused during a parking manoeuvre.',              status: 'SUBMITTED'    },
  { claim_number: 'CLM-2026-0010', policy_number: 'POL-2026-002', claim_type: 'Health',   amount: 210000,  incident_date: '2026-08-08', description: 'ICU admission following cardiac event — 5-day hospital stay.',                status: 'APPROVED'     },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding test user…');
    const hash = await bcrypt.hash(TEST_USER.password, 12);
    await client.query(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [TEST_USER.email, TEST_USER.full_name, hash]
    );

    console.log('Seeding policies…');
    for (const p of policies) {
      await client.query(
        `INSERT INTO policies (policy_number, customer_name, policy_type, status)
         VALUES ($1, $2, $3, $4) ON CONFLICT (policy_number) DO NOTHING`,
        [p.policy_number, p.customer_name, p.policy_type, p.status]
      );
    }

    console.log('Seeding claims…');
    for (const c of claimTemplates) {
      const row = await client.query(
        'SELECT id FROM policies WHERE policy_number = $1',
        [c.policy_number]
      );
      if (!row.rows.length) {
        console.warn(`  Skipping ${c.claim_number} — policy ${c.policy_number} not found`);
        continue;
      }
      await client.query(
        `INSERT INTO claims (claim_number, policy_id, claim_type, amount, incident_date, description, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (claim_number) DO NOTHING`,
        [c.claim_number, row.rows[0].id, c.claim_type, c.amount, c.incident_date, c.description, c.status]
      );
    }

    console.log(`\nSeed complete.`);
    console.log(`Test credentials: ${TEST_USER.email} / ${TEST_USER.password}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
