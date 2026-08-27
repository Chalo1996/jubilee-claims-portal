import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClaims } from '../hooks/useClaims';
import ClaimsTable from '../components/ClaimsTable';
import ClaimsFilters from '../components/ClaimsFilters';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import ErrorAlert from '../components/ErrorAlert';

export default function DashboardPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 10 });
  const { claims, pagination, loading, error, refresh } = useClaims(filters);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claims Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review, process and track all insurance claims.
          </p>
        </div>
        <Link
          to="/claims/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-jubilee-600 text-white text-sm font-medium
                     rounded-md hover:bg-jubilee-700 focus:outline-none focus:ring-2 focus:ring-danube-500 transition-colors w-full sm:w-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Claim
        </Link>
      </div>

      {/* Summary bar */}
      {pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Claims',    value: pagination.total },
            { label: 'This Page',       value: claims.length },
            { label: 'Current Page',    value: `${pagination.page} / ${pagination.totalPages}` },
            { label: 'Per Page',        value: pagination.limit },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-xl font-semibold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <ClaimsFilters filters={filters} onChange={setFilters} />

      {/* Table card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorAlert message={error} onRetry={refresh} />
          </div>
        ) : (
          <>
            <ClaimsTable claims={claims} />
            <Pagination
              pagination={pagination}
              onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            />
          </>
        )}
      </div>
    </div>
  );
}
