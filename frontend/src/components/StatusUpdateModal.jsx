import { useState } from 'react';
import { updateClaimStatus } from '../services/api';
import Spinner from './Spinner';

export default function StatusUpdateModal({ claim, onClose, onSuccess }) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const allowed = claim.allowedTransitions || [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const result = await updateClaimStatus(claim.id, selected);
      onSuccess(result.claim);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">Update Claim Status</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              Claim <span className="font-medium text-gray-900">{claim.claim_number}</span> is currently{' '}
              <span className="font-medium text-gray-900">{claim.status.replace('_', ' ')}</span>.
            </p>
          </div>

          {allowed.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              This claim is in a terminal state and cannot be updated further.
            </p>
          ) : (
            <div>
              <label htmlFor="new-status" className="block text-sm font-medium text-gray-700 mb-1">
                New status
              </label>
              <select
                id="new-status"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                {allowed.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300
                         rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            {allowed.length > 0 && (
              <button
                type="submit"
                disabled={!selected || loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                           text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {loading && <Spinner size="sm" />}
                Update Status
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
