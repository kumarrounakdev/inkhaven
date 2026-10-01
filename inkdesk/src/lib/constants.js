export const STATUS_ORDER = ['new', 'confirmed', 'rescheduled', 'completed', 'cancelled'];
export const ACTIVE_STATUSES = ['new', 'confirmed', 'rescheduled'];

export const STATUS_LABEL = {
  new: 'New',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STYLE_OPTIONS = [
  { value: 'blackwork', label: 'Blackwork' },
  { value: 'fineline', label: 'Fine Line' },
  { value: 'realism', label: 'Realism' },
  { value: 'anime', label: 'Anime' },
  { value: 'other', label: 'Other' },
];

export const SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'cover-up', label: 'Cover-up' },
  { value: 'custom', label: 'Custom' },
];

export const SCOPE_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'past', label: 'Archive' },
  { value: 'all', label: 'All' },
];

const STYLE_LABELS = Object.fromEntries(STYLE_OPTIONS.map((s) => [s.value, s.label]));
const SIZE_LABELS = Object.fromEntries(SIZE_OPTIONS.map((s) => [s.value, s.label]));

export function styleLabel(value) {
  return STYLE_LABELS[value] || (value ? value[0].toUpperCase() + value.slice(1) : '—');
}

export function sizeLabel(value) {
  return SIZE_LABELS[value] || value || '—';
}
