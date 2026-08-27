import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

export default function ClaimsTable({ claims }) {
  const navigate = useNavigate();

  if (claims.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
        <p className="font-medium">No claims found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200" role="table">
        <thead className="bg-gray-50">
          <tr>
            {['Claim #', 'Policy #', 'Customer', 'Type', 'Amount', 'Incident Date', 'Status', 'Submitted'].map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {claims.map((claim) => (
            <tr
              key={claim.id}
              onClick={() => navigate(`/claims/${claim.id}`)}
              className="hover:bg-jubilee-50 cursor-pointer transition-colors"
              role="row"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/claims/${claim.id}`)}
              aria-label={`View claim ${claim.claim_number}`}
            >
               <td className="px-4 py-3 text-sm font-medium text-jubilee-700 whitespace-nowrap">
                {claim.claim_number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {claim.policy_number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {claim.customer_name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {claim.claim_type}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap font-medium">
                {formatCurrency(claim.amount)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {formatDate(claim.incident_date)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge status={claim.status} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                {formatDateTime(claim.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
