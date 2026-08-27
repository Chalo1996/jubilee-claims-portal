const claimsService = require('../services/claimsService');
const { getAllowedTransitions } = require('../services/statusMachine');

async function listClaims(req, res, next) {
  try {
    const page       = parseInt(req.query.page, 10)  || 1;
    const limit      = parseInt(req.query.limit, 10) || 10;
    const status     = req.query.status     || undefined;
    const claim_type = req.query.claim_type || undefined;
    const search     = req.query.search     || undefined;

    res.json(await claimsService.listClaims({ page, limit, status, claim_type, search }));
  } catch (err) {
    next(err);
  }
}

async function getClaimById(req, res, next) {
  try {
    const claim = await claimsService.getClaimById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found.' });
    res.json({ ...claim, allowedTransitions: getAllowedTransitions(claim.status) });
  } catch (err) {
    next(err);
  }
}

async function createClaim(req, res, next) {
  try {
    const { policy_number, claim_type, amount, incident_date, description } = req.body;
    const claim = await claimsService.createClaim({
      policy_number,
      claim_type,
      amount: parseFloat(amount),
      incident_date,
      description,
    });
    res.status(201).json(claim);
  } catch (err) {
    next(err);
  }
}

async function updateClaimStatus(req, res, next) {
  try {
    res.json(await claimsService.updateClaimStatus(req.params.id, req.body.status));
  } catch (err) {
    next(err);
  }
}

async function listPolicies(req, res, next) {
  try {
    res.json({ data: await claimsService.listPolicies() });
  } catch (err) {
    next(err);
  }
}

module.exports = { listClaims, getClaimById, createClaim, updateClaimStatus, listPolicies };
