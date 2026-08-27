import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClaim, fetchPolicies } from '../services/api';
import Spinner from '../components/Spinner';
import ErrorAlert from '../components/ErrorAlert';

const CLAIM_TYPES = ['Motor', 'Health', 'Travel', 'Property', 'Other'];

const INITIAL_FORM = {
  policy_number: '',
  claim_type:    '',
  amount:        '',
  incident_date: '',
  description:   '',
};

export default function CreateClaimPage() {
  const navigate = useNavigate();

  const [form, setForm]         = useState(INITIAL_FORM);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  // Load policies for the dropdown
  useEffect(() => {
    fetchPolicies()
      .then((res) => setPolicies(res.data || []))
      .catch(() => {/* non-critical — user can type the policy number */})
      .finally(() => setLoadingPolicies(false));
  }, []);

  // ── Client-side validation ───────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.policy_number.trim()) errs.policy_number = 'Policy number is required.';
    if (!form.claim_type)           errs.claim_type    = 'Claim type is required.';
    if (!form.amount || Number(form.amount) <= 0)
                                    errs.amount        = 'Amount must be greater than 0.';
    if (!form.incident_date)        errs.incident_date = 'Incident date is required.';
    else if (new Date(form.incident_date) > new Date())
                                    errs.incident_date = 'Incident date cannot be in the future.';
    if (!form.description.trim())   errs.description   = 'Description is required.';
    else if (form.description.trim().length < 10)
                                    errs.description   = 'Description must be at least 10 characters.';
    return errs;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setApiError(null);
    try {
      const claim = await createClaim({
        policy_number: form.policy_number.trim(),
        claim_type:    form.claim_type,
        amount:        Number(form.amount),
        incident_date: form.incident_date,
        description:   form.description.trim(),
      });
      navigate(`/claims/${claim.id}`, { state: { successMessage: 'Claim submitted successfully.' } });
    } catch (err) {
      // Server-side field errors
      if (err.errors) {
        const serverErrs = {};
        err.errors.forEach(({ field, message }) => { serverErrs[field] = message; });
        setErrors(serverErrs);
      } else {
        setApiError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];

  function fieldClass(name) {
    return `w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-jubilee-500
            ${errors[name] ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'}`;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="text-gray-400 hover:text-gray-600"
          aria-label="Back to dashboard"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Claim</h1>
          <p className="text-sm text-gray-500 mt-0.5">Submit a new insurance claim for processing.</p>
        </div>
      </div>

      {apiError && <ErrorAlert message={apiError} />}

      {/* Form card */}
      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">

        {/* Policy */}
        <div>
          <label htmlFor="policy_number" className="block text-sm font-medium text-gray-700 mb-1">
            Policy Number <span className="text-red-500">*</span>
          </label>
          {loadingPolicies ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" /> Loading policies…
            </div>
          ) : policies.length > 0 ? (
            <select
              id="policy_number"
              name="policy_number"
              value={form.policy_number}
              onChange={handleChange}
              className={fieldClass('policy_number')}
              aria-describedby={errors.policy_number ? 'policy_number-error' : undefined}
            >
              <option value="">— Select a policy —</option>
              {policies.map((p) => (
                <option key={p.id} value={p.policy_number}>
                  {p.policy_number} — {p.customer_name} ({p.policy_type})
                </option>
              ))}
            </select>
          ) : (
            <input
              id="policy_number"
              name="policy_number"
              type="text"
              placeholder="e.g. POL-2026-001"
              value={form.policy_number}
              onChange={handleChange}
              className={fieldClass('policy_number')}
              aria-describedby={errors.policy_number ? 'policy_number-error' : undefined}
            />
          )}
          {errors.policy_number && (
            <p id="policy_number-error" className="mt-1 text-xs text-red-600" role="alert">{errors.policy_number}</p>
          )}
        </div>

        {/* Claim Type */}
        <div>
          <label htmlFor="claim_type" className="block text-sm font-medium text-gray-700 mb-1">
            Claim Type <span className="text-red-500">*</span>
          </label>
          <select
            id="claim_type"
            name="claim_type"
            value={form.claim_type}
            onChange={handleChange}
            className={fieldClass('claim_type')}
            aria-describedby={errors.claim_type ? 'claim_type-error' : undefined}
          >
            <option value="">— Select type —</option>
            {CLAIM_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {errors.claim_type && (
            <p id="claim_type-error" className="mt-1 text-xs text-red-600" role="alert">{errors.claim_type}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Claim Amount (KES) <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            placeholder="e.g. 250000"
            value={form.amount}
            onChange={handleChange}
            className={fieldClass('amount')}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
          />
          {errors.amount && (
            <p id="amount-error" className="mt-1 text-xs text-red-600" role="alert">{errors.amount}</p>
          )}
        </div>

        {/* Incident Date */}
        <div>
          <label htmlFor="incident_date" className="block text-sm font-medium text-gray-700 mb-1">
            Incident Date <span className="text-red-500">*</span>
          </label>
          <input
            id="incident_date"
            name="incident_date"
            type="date"
            max={today}
            value={form.incident_date}
            onChange={handleChange}
            className={fieldClass('incident_date')}
            aria-describedby={errors.incident_date ? 'incident_date-error' : undefined}
          />
          {errors.incident_date && (
            <p id="incident_date-error" className="mt-1 text-xs text-red-600" role="alert">{errors.incident_date}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Describe the incident in detail (minimum 10 characters)…"
            value={form.description}
            onChange={handleChange}
            className={fieldClass('description')}
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p id="description-error" className="text-xs text-red-600" role="alert">{errors.description}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-gray-400">{form.description.length} / 2000</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Link
            to="/"
            className="flex-1 text-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300
                       rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                       text-white bg-jubilee-600 rounded-md hover:bg-jubilee-700 disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-jubilee-500"
          >
            {submitting && <Spinner size="sm" />}
            {submitting ? 'Submitting…' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}
