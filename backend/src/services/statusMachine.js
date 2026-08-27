const TRANSITIONS = {
  SUBMITTED:    ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED:     ['PAID'],
  REJECTED:     [],
  PAID:         [],
};

function getAllowedTransitions(currentStatus) {
  return TRANSITIONS[currentStatus] ?? [];
}

function validateTransition(from, to) {
  if (!TRANSITIONS[from]) {
    return { valid: false, reason: `Unknown status: ${from}` };
  }
  if (TRANSITIONS[from].length === 0) {
    return { valid: false, reason: `Status '${from}' is terminal and cannot be changed.` };
  }
  if (!TRANSITIONS[from].includes(to)) {
    const allowed = TRANSITIONS[from].join(', ');
    return {
      valid: false,
      reason: `Cannot transition from '${from}' to '${to}'. Allowed: ${allowed}.`,
    };
  }
  return { valid: true };
}

module.exports = { validateTransition, getAllowedTransitions, TRANSITIONS };
