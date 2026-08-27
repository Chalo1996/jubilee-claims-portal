const { validateTransition, getAllowedTransitions } = require('../services/statusMachine');

describe('Status Machine — validateTransition', () => {
  // ── Valid transitions ────────────────────────────────────────
  test('SUBMITTED → UNDER_REVIEW is valid', () => {
    const result = validateTransition('SUBMITTED', 'UNDER_REVIEW');
    expect(result.valid).toBe(true);
  });

  test('UNDER_REVIEW → APPROVED is valid', () => {
    const result = validateTransition('UNDER_REVIEW', 'APPROVED');
    expect(result.valid).toBe(true);
  });

  test('UNDER_REVIEW → REJECTED is valid', () => {
    const result = validateTransition('UNDER_REVIEW', 'REJECTED');
    expect(result.valid).toBe(true);
  });

  test('APPROVED → PAID is valid', () => {
    const result = validateTransition('APPROVED', 'PAID');
    expect(result.valid).toBe(true);
  });

  // ── Invalid transitions ──────────────────────────────────────
  test('SUBMITTED → APPROVED is invalid (skips UNDER_REVIEW)', () => {
    const result = validateTransition('SUBMITTED', 'APPROVED');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/UNDER_REVIEW/);
  });

  test('SUBMITTED → PAID is invalid', () => {
    const result = validateTransition('SUBMITTED', 'PAID');
    expect(result.valid).toBe(false);
  });

  test('APPROVED → REJECTED is invalid', () => {
    const result = validateTransition('APPROVED', 'REJECTED');
    expect(result.valid).toBe(false);
  });

  test('REJECTED is a terminal state — no transitions allowed', () => {
    const result = validateTransition('REJECTED', 'SUBMITTED');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/terminal/i);
  });

  test('PAID is a terminal state — no transitions allowed', () => {
    const result = validateTransition('PAID', 'APPROVED');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/terminal/i);
  });

  test('Unknown status returns invalid result', () => {
    const result = validateTransition('NONEXISTENT', 'APPROVED');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/unknown/i);
  });
});

describe('Status Machine — getAllowedTransitions', () => {
  test('SUBMITTED has one allowed next state', () => {
    expect(getAllowedTransitions('SUBMITTED')).toEqual(['UNDER_REVIEW']);
  });

  test('UNDER_REVIEW can go to APPROVED or REJECTED', () => {
    const allowed = getAllowedTransitions('UNDER_REVIEW');
    expect(allowed).toContain('APPROVED');
    expect(allowed).toContain('REJECTED');
  });

  test('REJECTED has no allowed transitions', () => {
    expect(getAllowedTransitions('REJECTED')).toEqual([]);
  });

  test('PAID has no allowed transitions', () => {
    expect(getAllowedTransitions('PAID')).toEqual([]);
  });
});
