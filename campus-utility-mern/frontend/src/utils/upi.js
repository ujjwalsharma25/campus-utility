// Builds a standard "upi://pay" deep link - a free, open intent that UPI apps
// understand. It is NOT a payment gateway and needs no API key. Because there is
// no gateway, the app cannot verify a payment by itself: the student pastes the
// 12-digit UPI reference (UTR) from their payment app, and staff cross-check it.
export const PAYEE_VPA = import.meta.env.VITE_PAYEE_VPA || 'miet-canteen@upi';
export const PAYEE_NAME = import.meta.env.VITE_PAYEE_NAME || 'MIET Campus Utility';

export function buildUpiLink({ amount, note }) {
  const params = new URLSearchParams({
    pa: PAYEE_VPA,
    pn: PAYEE_NAME,
    am: Number(amount).toFixed(2),
    cu: 'INR',
    tn: note || 'Campus Utility order',
  });
  return `upi://pay?${params.toString()}`;
}
