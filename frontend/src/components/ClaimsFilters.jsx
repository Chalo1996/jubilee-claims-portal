import { useState } from 'react';

const STATUSES   = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];
const CLAIM_TYPES = ['Motor', 'Health', 'Travel', 'Property', 'Other'];

export default function ClaimsFilters({ filters, onChange }) {
  const [search, setSearch] = useState(filters.search || '');

  function handleSearchKey(e) {
    if (e.key === 'Enter') {
      onChange({ ...filters, search: search.trim(), page: 1 });
    }
  }

  function handleSearchBlur() {
    if (search.trim() !== (filters.search || '')) {
      onChange({ ...filters, search: search.trim(), page: 1 });
    }
  }

  function handleSelect(key, value) {
    onChange({ ...filters, [key]: value || undefined, page: 1 });
  }

  function handleClear() {
    setSearch('');
    onChange({ page: 1, limit: filters.limit });
  }

  const hasActiveFilters = filters.search || filters.status || filters.claim_type;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search claim #, policy #, or customer name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
            onBlur={handleSearchBlur}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search claims"
          />
        </div>

        {/* Status filter */}
        <select
          value={filters.status || ''}
          onChange={(e) => handleSelect('status', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        {/* Claim type filter */}
        <select
          value={filters.claim_type || ''}
          onChange={(e) => handleSelect('claim_type', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by claim type"
        >
          <option value="">All types</option>
          {CLAIM_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
