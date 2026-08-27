const pool = require('../db/pool');
const { validateTransition, getAllowedTransitions } = require('./statusMachine');

function buildWhereClause(filters, startIndex = 1) {
  const conditions = [];
  const params = [];
  let idx = startIndex;

  if (filters.status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.claim_type) {
    conditions.push(`c.claim_type = $${idx++}`);
    params.push(filters.claim_type);
  }
  if (filters.search) {
    conditions.push(
      `(c.claim_number ILIKE $${idx} OR p.policy_number ILIKE $${idx} OR p.customer_name ILIKE $${idx})`
    );
    params.push(`%${filters.search}%`);
    idx++;
  }

  const whereSQL = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSQL, params, nextIndex: idx };
}

async function listClaims({ page = 1, limit = 10, status, claim_type, search } = {}) {
  const offset = (page - 1) * limit;
  const { whereSQL, params, nextIndex } = buildWhereClause({ status, claim_type, search }, 1);

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM claims c JOIN policies p ON c.policy_id = p.id ${whereSQL}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const dataResult = await pool.query(
    `SELECT
       c.id, c.claim_number, c.claim_type, c.amount, c.incident_date,
       c.status, c.created_at, c.updated_at,
       p.id AS policy_id, p.policy_number, p.customer_name, p.policy_type,
       p.status AS policy_status
     FROM claims c
     JOIN policies p ON c.policy_id = p.id
     ${whereSQL}
     ORDER BY c.created_at DESC
     LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    data: dataResult.rows,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

async function getClaimById(id) {
  const result = await pool.query(
    `SELECT
       c.id, c.claim_number, c.claim_type, c.amount, c.incident_date,
       c.description, c.status, c.created_at, c.updated_at,
       p.id AS policy_id, p.policy_number, p.customer_name, p.policy_type,
       p.status AS policy_status
     FROM claims c
     JOIN policies p ON c.policy_id = p.id
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

async function createClaim({ policy_number, claim_type, amount, incident_date, description }) {
  const policyResult = await pool.query(
    'SELECT id FROM policies WHERE policy_number = $1',
    [policy_number]
  );
  if (!policyResult.rows.length) {
    const err = new Error(`Policy '${policy_number}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const policyId = policyResult.rows[0].id;
  const year = new Date().getFullYear();
  const countResult = await pool.query(
    'SELECT COUNT(*) AS cnt FROM claims WHERE claim_number LIKE $1',
    [`CLM-${year}-%`]
  );
  const seq = parseInt(countResult.rows[0].cnt, 10) + 1;
  const claimNumber = `CLM-${year}-${String(seq).padStart(4, '0')}`;

  const insertResult = await pool.query(
    `INSERT INTO claims (claim_number, policy_id, claim_type, amount, incident_date, description, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'SUBMITTED')
     RETURNING id`,
    [claimNumber, policyId, claim_type, amount, incident_date, description]
  );

  return getClaimById(insertResult.rows[0].id);
}

async function updateClaimStatus(id, newStatus) {
  const claim = await getClaimById(id);
  if (!claim) {
    const err = new Error('Claim not found.');
    err.statusCode = 404;
    throw err;
  }

  const { valid, reason } = validateTransition(claim.status, newStatus);
  if (!valid) {
    const err = new Error(reason);
    err.statusCode = 409;
    throw err;
  }

  await pool.query('UPDATE claims SET status = $1 WHERE id = $2', [newStatus, id]);

  const updated = await getClaimById(id);
  return { claim: updated, allowedTransitions: getAllowedTransitions(updated.status) };
}

async function listPolicies() {
  const result = await pool.query(
    'SELECT id, policy_number, customer_name, policy_type, status FROM policies ORDER BY policy_number'
  );
  return result.rows;
}

module.exports = { listClaims, getClaimById, createClaim, updateClaimStatus, listPolicies };
