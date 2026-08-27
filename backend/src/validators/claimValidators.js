const { body, query, param } = require('express-validator');

const CLAIM_TYPES    = ['Motor', 'Health', 'Travel', 'Property', 'Other'];
const CLAIM_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];

const createClaimRules = [
  body('policy_number')
    .trim().notEmpty().withMessage('policy_number is required.')
    .isLength({ max: 50 }).withMessage('policy_number must be 50 characters or fewer.'),
  body('claim_type')
    .trim().notEmpty().withMessage('claim_type is required.')
    .isIn(CLAIM_TYPES).withMessage(`claim_type must be one of: ${CLAIM_TYPES.join(', ')}.`),
  body('amount')
    .notEmpty().withMessage('amount is required.')
    .isFloat({ gt: 0 }).withMessage('amount must be a positive number.'),
  body('incident_date')
    .notEmpty().withMessage('incident_date is required.')
    .isISO8601().withMessage('incident_date must be a valid date (YYYY-MM-DD).')
    .custom((value) => {
      if (new Date(value) > new Date()) throw new Error('incident_date cannot be in the future.');
      return true;
    }),
  body('description')
    .trim().notEmpty().withMessage('description is required.')
    .isLength({ min: 10, max: 2000 }).withMessage('description must be between 10 and 2000 characters.'),
];

const listClaimsRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
  query('status').optional().isIn(CLAIM_STATUSES).withMessage(`status must be one of: ${CLAIM_STATUSES.join(', ')}.`),
  query('claim_type').optional().isIn(CLAIM_TYPES).withMessage(`claim_type must be one of: ${CLAIM_TYPES.join(', ')}.`),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('search must be 100 characters or fewer.'),
];

const updateStatusRules = [
  param('id').isUUID().withMessage('id must be a valid UUID.'),
  body('status')
    .trim().notEmpty().withMessage('status is required.')
    .isIn(CLAIM_STATUSES).withMessage(`status must be one of: ${CLAIM_STATUSES.join(', ')}.`),
];

const claimIdParamRules = [
  param('id').isUUID().withMessage('id must be a valid UUID.'),
];

module.exports = { createClaimRules, listClaimsRules, updateStatusRules, claimIdParamRules };
