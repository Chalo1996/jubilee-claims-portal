/**
 * Display helpers — keeps formatting logic out of components.
 */

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// Status badge colours  (Tailwind classes)
const STATUS_STYLES = {
  SUBMITTED:    'bg-danube-100 text-danube-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED:     'bg-green-100 text-green-800',
  REJECTED:     'bg-red-100 text-red-800',
  PAID:         'bg-purple-100 text-purple-800',
};

export function statusStyle(status) {
  return STATUS_STYLES[status] || 'bg-gray-100 text-gray-800';
}

export function statusLabel(status) {
  return status?.replace('_', ' ') ?? '—';
}
