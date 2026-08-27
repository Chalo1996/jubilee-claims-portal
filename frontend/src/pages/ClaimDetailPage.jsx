import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { fetchClaim } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import StatusUpdateModal from '../components/StatusUpdateModal';
import Spinner from '../components/Spinner';
import ErrorAlert from '../components/ErrorAlert';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500 sm:w-40 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5 sm:mt-0">{children}</dd>
    </div>
  );
}

export default function ClaimDetailPage() {
  const { id } = useParams();
  const location = useLocation();

  const [claim, setClaim]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState(location.state?.successMessage || null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function loadClaim() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClaim(id);
      setClaim(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClaim(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStatusUpdated(updatedClaim) {
    setClaim((prev) => ({ ...prev, ...updatedClaim }));
    setShowModal(false);
    setToast(`Status updated to ${updatedClaim.status.replace('_', ' ')}.`);
    // Re-fetch to get latest allowedTransitions
    loadClaim();
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <ErrorAlert message={error} onRetry={loadClaim} />
      </div>
    );
  }

  if (!claim) return null;

  const canUpdate = (claim.allowedTransitions || []).length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed top-4 right-4 z-50 bg-jubilee-600 text-white text-sm font-medium px-4 py-3
                     rounded-lg shadow-lg flex items-center gap-2 animate-fade-in"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      {/* Back + Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Link to="/" className="text-gray-400 hover:text-gray-600 mt-1 flex-shrink-0" aria-label="Back to dashboard">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 break-words">{claim.claim_number}</h1>
              <StatusBadge status={claim.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Submitted {formatDateTime(claim.created_at)} · Last updated {formatDateTime(claim.updated_at)}
            </p>
          </div>
        </div>
        {canUpdate && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-jubilee-600 text-white text-sm font-medium
                       rounded-md hover:bg-jubilee-700 focus:outline-none focus:ring-2 focus:ring-danube-500 whitespace-nowrap w-full sm:w-auto"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Update Status
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Claim Details */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Claim Details</h2>
          <dl>
            <DetailRow label="Claim Number">{claim.claim_number}</DetailRow>
            <DetailRow label="Claim Type">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {claim.claim_type}
              </span>
            </DetailRow>
            <DetailRow label="Claimed Amount">
              <span className="text-lg font-semibold text-gray-900">{formatCurrency(claim.amount)}</span>
            </DetailRow>
            <DetailRow label="Incident Date">{formatDate(claim.incident_date)}</DetailRow>
            <DetailRow label="Current Status">
              <StatusBadge status={claim.status} />
            </DetailRow>
            <DetailRow label="Description">
              <span className="whitespace-pre-wrap leading-relaxed">{claim.description}</span>
            </DetailRow>
          </dl>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Policy Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Policy</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Policy Number</dt>
                <dd className="text-sm font-medium text-jubilee-700">{claim.policy_number}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Customer</dt>
                <dd className="text-sm text-gray-900">{claim.customer_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Policy Type</dt>
                <dd className="text-sm text-gray-900">{claim.policy_type}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide">Policy Status</dt>
                <dd>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    claim.policy_status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {claim.policy_status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Workflow Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Workflow</h2>
            {['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PAID'].map((step, idx) => {
              const statuses   = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];
              const currentIdx = statuses.indexOf(claim.status);
              const stepIdx    = statuses.indexOf(step);
              const isPast     = currentIdx > stepIdx;
              const isCurrent  = claim.status === step;
              const isRejected = claim.status === 'REJECTED';

              return (
                <div key={step} className="flex items-center gap-3 mb-2 last:mb-0">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isCurrent  ? 'bg-jubilee-600 text-white' :
                    isPast     ? 'bg-green-500 text-white' :
                    isRejected && stepIdx > currentIdx ? 'bg-gray-200 text-gray-400' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {isPast ? '✓' : idx + 1}
                  </div>
                   <span className={`text-sm ${isCurrent ? 'font-semibold text-jubilee-700' : isPast ? 'text-green-700' : 'text-gray-400'}`}>
                    {step.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
            {claim.status === 'REJECTED' && (
              <div className="mt-2 flex items-center gap-3">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-red-500 text-white">✕</div>
                <span className="text-sm font-semibold text-red-700">REJECTED</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status update modal */}
      {showModal && (
        <StatusUpdateModal
          claim={claim}
          onClose={() => setShowModal(false)}
          onSuccess={handleStatusUpdated}
        />
      )}
    </div>
  );
}
