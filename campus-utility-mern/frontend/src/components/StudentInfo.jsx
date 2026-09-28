import { useState } from 'react';

// Shows who placed an order: name, roll no, mobile and ID card photo (tap to enlarge).
// Used on the staff queues and the owner dashboard.
export function IdCardThumb({ src, className = 'h-12 w-16' }) {
  const [open, setOpen] = useState(false);
  if (!src) {
    return (
      <span className={`flex ${className} shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg`} title="No ID card photo">
        🪪
      </span>
    );
  }
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        title="Tap to view ID card"
        onClick={(e) => {
          e.stopPropagation(); // don't trigger the "advance status" tap on the card behind
          setOpen(true);
        }}
        className="shrink-0 cursor-zoom-in"
      >
        <img src={src} alt="Student ID card" className={`${className} rounded-lg border border-white/20 object-cover`} />
      </span>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <img src={src} alt="Student ID card" className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </>
  );
}

export default function StudentInfo({ order }) {
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl bg-black/25 p-2">
      <IdCardThumb src={order.id_card_photo} />
      <div className="min-w-0 text-xs">
        <p className="truncate font-semibold text-white">{order.user_name}</p>
        <p className="truncate text-slate-300">Roll: {order.roll_no}</p>
        {order.phone && (
          <p className="truncate text-slate-300">
            📞{' '}
            <a href={`tel:${order.phone}`} onClick={(e) => e.stopPropagation()} className="underline decoration-dotted">
              {order.phone}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
