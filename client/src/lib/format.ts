export const inr = (n?: number) => (typeof n === 'number' ? '₹' + n.toLocaleString('en-IN') : '—');
export const num = (n?: number) => (typeof n === 'number' ? n.toLocaleString('en-IN') : '—');
export const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('en-IN') : '—');
