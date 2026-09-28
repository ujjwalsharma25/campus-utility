import { useEffect, useState } from 'react';
import { fetchCanteens, fetchMenu, createOrder } from '../api';
import { useAuth } from '../context/AuthContext';
import TokenCard3D from './TokenCard3D';
import Receipt from './Receipt';
import PaymentModal from './PaymentModal';

const PRICE_PER_PAGE = { 'B&W': 2, Color: 5 };
const CASH_ADVANCE_FEE = 10;
// Demo mode: skip the payment screen entirely (set VITE_DEMO_SKIP_PAYMENT=false to bring it back)
const DEMO_SKIP_PAYMENT = import.meta.env.VITE_DEMO_SKIP_PAYMENT !== 'false';

function PaymentModePicker({ paymentMode, setPaymentMode, payableNow, cashRemainder }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-midnight-900 p-4">
      <p className="mb-2 text-xs font-medium text-slate-400">Mode of payment</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPaymentMode('Online')}
          className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
            paymentMode === 'Online'
              ? 'border-teal-500 bg-teal-500 text-midnight-950'
              : 'border-white/10 bg-midnight-950 text-slate-300'
          }`}
        >
          💳 Pay online (UPI)
        </button>
        <button
          type="button"
          onClick={() => setPaymentMode('Cash')}
          className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
            paymentMode === 'Cash'
              ? 'border-marigold-500 bg-marigold-500 text-midnight-950'
              : 'border-white/10 bg-midnight-950 text-slate-300'
          }`}
        >
          💵 Cash at counter
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        {paymentMode === 'Online'
          ? `Pay the full ₹${payableNow.toFixed(2)} now via any UPI app - no cash needed at pickup.`
          : `Pay a ₹${CASH_ADVANCE_FEE} booking fee now via UPI to hold your token, then ₹${cashRemainder.toFixed(2)} cash at the counter.`}
      </p>
    </div>
  );
}

export default function StudentPanel() {
  const { user, bumpOrderCount } = useAuth();
  const [mode, setMode] = useState('Food');

  const [canteens, setCanteens] = useState([]);
  const [activeCanteen, setActiveCanteen] = useState(null);
  const [menu, setMenu] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [cart, setCart] = useState({});
  const [foodPayment, setFoodPayment] = useState('Online');

  const [printFile, setPrintFile] = useState(null);
  const [pages, setPages] = useState(1);
  const [printType, setPrintType] = useState('B&W');
  const [printPayment, setPrintPayment] = useState('Online');

  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [pending, setPending] = useState(null); // order waiting for payment confirmation
  const [payError, setPayError] = useState('');

  useEffect(() => {
    fetchCanteens().then((data) => {
      setCanteens(data);
      const foodCanteen = data.find((c) => c.name.toLowerCase().includes('canteen')) || data[0];
      setActiveCanteen(foodCanteen || null);
      const shop = data.find((c) => c.name.toLowerCase().includes('stationary'));
      if (shop) {
        fetchMenu(shop._id).then(setShopItems);
      }
    });
  }, []);

  useEffect(() => {
    if (activeCanteen) {
      fetchMenu(activeCanteen._id).then(setMenu);
    }
  }, [activeCanteen]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev[item.item_name];
      const quantity = existing ? existing.quantity + 1 : 1;
      return { ...prev, [item.item_name]: { item_name: item.item_name, price: Number(item.price), quantity } };
    });
  };

  const removeFromCart = (itemName) => {
    setCart((prev) => {
      const existing = prev[itemName];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemName];
        return next;
      }
      return { ...prev, [itemName]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const printTotal = pages * PRICE_PER_PAGE[printType];

  // Nothing is sent to the server yet - the order is only created once the
  // student confirms payment with their UPI reference number.
  const startFoodPayment = () => {
    if (cartItems.length === 0) return;
    setOrderError('');
    setPayError('');
    beginPayment({
      mode: foodPayment,
      amountNow: foodPayment === 'Online' ? cartTotal : CASH_ADVANCE_FEE,
      cashRemainder: foodPayment === 'Cash' ? cartTotal : 0,
      payload: {
        type: 'Food',
        canteen_id: activeCanteen._id,
        items: cartItems.map(({ item_name, quantity }) => ({ item_name, quantity })),
        payment_mode: foodPayment,
      },
    });
  };

  const startPrintPayment = () => {
    if (!printFile) {
      setOrderError('Please choose a file to print first.');
      return;
    }
    setOrderError('');
    setPayError('');
    beginPayment({
      mode: printPayment,
      amountNow: printPayment === 'Online' ? printTotal : CASH_ADVANCE_FEE,
      cashRemainder: printPayment === 'Cash' ? printTotal : 0,
      payload: {
        type: 'Print',
        print_job: { filename: printFile.name, pages: Number(pages), print_type: printType },
        payment_mode: printPayment,
      },
    });
  };

  // DEMO MODE (frontend/.env: VITE_DEMO_SKIP_PAYMENT=true): no payment screen at all,
  // the order is sent straight to the counter. Backend must have DEMO_SKIP_PAYMENT=true too.
  const beginPayment = (next) => {
    if (DEMO_SKIP_PAYMENT) {
      confirmPayment('', next);
    } else {
      setPending(next);
    }
  };

  const confirmPayment = async (paymentRef, override) => {
    const current = override || pending;
    setPlacing(true);
    setPayError('');
    try {
      const order = await createOrder({ ...current.payload, ...(paymentRef ? { payment_ref: paymentRef } : {}) });
      setReceipt(order);
      if (current.payload.type === 'Food') {
        setCart({});
      } else {
        setPrintFile(null);
        setPages(1);
      }
      setPending(null);
      bumpOrderCount();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not place the order. Please try again.';
      setPayError(msg);
      setOrderError(msg);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-extrabold text-white">Hey, {user.name.split(' ')[0]} 👋</p>
          <p className="text-sm text-slate-400">
            Roll No. {user.roll_no} · {user.order_count} orders placed so far
          </p>
        </div>
        <div className="flex gap-2 rounded-2xl bg-white/5 p-1.5">
          {['Food', 'Print'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
                mode === m ? 'bg-teal-500 text-midnight-950' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {m === 'Food' ? '🍔 Canteen' : '🖨️ Print shop'}
            </button>
          ))}
        </div>
      </div>

      {orderError && (
        <div className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{orderError}</div>
      )}

      {mode === 'Food' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {activeCanteen && (
              <div className="mb-4 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${activeCanteen.is_open ? 'bg-teal-400' : 'bg-rose-500'}`} />
                <p className="text-sm text-slate-300">
                  {activeCanteen.name} is {activeCanteen.is_open ? 'open now' : 'closed'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {menu.map((item) => (
                <TokenCard3D key={item._id}>
                  <button
                    onClick={() => item.is_available && addToCart(item)}
                    disabled={!item.is_available}
                    className={`flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-midnight-800 to-midnight-900 text-left transition hover:border-marigold-500/60 ${
                      !item.is_available ? 'cursor-not-allowed opacity-40' : ''
                    }`}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.item_name} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center bg-midnight-950 text-2xl text-slate-600">
                        🍽️
                      </div>
                    )}
                    <div className="p-4 pb-0">
                      <p className="font-display text-sm font-semibold text-white">{item.item_name}</p>
                      {!item.is_available && <p className="mt-1 text-[11px] text-rose-400">Sold out</p>}
                    </div>
                    <div className="flex items-center justify-between p-4 pt-3">
                      <span className="font-display text-lg font-bold text-marigold-400">
                        ₹{Number(item.price).toFixed(0)}
                      </span>
                      <span className="rounded-lg bg-white/10 px-2 py-1 text-xs">
                        {cart[item.item_name] ? `In cart · ${cart[item.item_name].quantity}` : 'Add'}
                      </span>
                    </div>
                  </button>
                </TokenCard3D>
              ))}
            </div>
          </div>

          <div className="h-fit space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="font-display text-lg font-bold text-white">Your cart</p>
            {cartItems.length === 0 ? (
              <p className="text-sm text-slate-400">Tap a dish to add it here.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {cartItems.map((it) => (
                    <div key={it.item_name} className="flex items-center justify-between text-sm">
                      <span className="text-slate-200">{it.item_name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(it.item_name)}
                          className="h-6 w-6 rounded-md bg-white/10 text-xs"
                        >
                          -
                        </button>
                        <span className="w-5 text-center">{it.quantity}</span>
                        <button
                          onClick={() => addToCart({ item_name: it.item_name, price: it.price })}
                          className="h-6 w-6 rounded-md bg-white/10 text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 font-display text-base font-bold text-white">
                    <span>Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <PaymentModePicker
                  paymentMode={foodPayment}
                  setPaymentMode={setFoodPayment}
                  payableNow={cartTotal}
                  cashRemainder={cartTotal}
                />

                <button
                  onClick={startFoodPayment}
                  disabled={placing}
                  className="w-full rounded-xl bg-marigold-500 py-3 text-sm font-bold text-midnight-950 transition hover:bg-marigold-400 disabled:opacity-50"
                >
                  {DEMO_SKIP_PAYMENT ? (placing ? 'Placing order…' : 'Place order') : 'Continue to payment'}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
            <p className="font-display text-lg font-bold text-white">Send a print job</p>
            <p className="mt-1 text-sm text-slate-400">
              Upload the file you need printed and set your specs. Skip the counter, just collect it.
            </p>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-midnight-900 px-6 py-10 text-center transition hover:border-marigold-500/60">
              <input type="file" className="hidden" onChange={(e) => setPrintFile(e.target.files?.[0] || null)} />
              <span className="text-3xl">📄</span>
              <span className="mt-3 text-sm font-medium text-white">
                {printFile ? printFile.name : 'Click to choose a file'}
              </span>
              <span className="mt-1 text-xs text-slate-500">PDF, DOCX or image files</span>
            </label>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Number of pages</label>
                <input
                  type="number"
                  min="1"
                  value={pages}
                  onChange={(e) => setPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full rounded-xl border border-white/10 bg-midnight-900 px-4 py-2.5 text-sm text-white outline-none focus:border-marigold-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Print type</label>
                <div className="flex gap-2">
                  {['B&W', 'Color'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setPrintType(t)}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                        printType === t
                          ? 'border-teal-500 bg-teal-500 text-midnight-950'
                          : 'border-white/10 bg-midnight-900 text-slate-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {shopItems.length > 0 && (
              <div className="mt-8">
                <p className="font-display text-base font-bold text-white">Also available at the shop</p>
                <p className="mb-3 text-xs text-slate-500">Buy these directly at the counter.</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {shopItems.map((it) => (
                    <div
                      key={it._id}
                      className={`overflow-hidden rounded-2xl border border-white/10 bg-midnight-900 ${
                        it.is_available ? '' : 'opacity-40'
                      }`}
                    >
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.item_name} className="h-20 w-full object-cover" />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center bg-midnight-950 text-2xl text-slate-600">
                          🧾
                        </div>
                      )}
                      <div className="p-3">
                        <p className="truncate text-xs font-medium text-white">{it.item_name}</p>
                        <p className="text-xs text-marigold-400">
                          ₹{Number(it.price).toFixed(0)}
                          {!it.is_available && <span className="ml-2 text-rose-400">Out of stock</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-fit space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="font-display text-lg font-bold text-white">Print summary</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">File</span>
                <span className="truncate pl-4 text-white">{printFile?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pages</span>
                <span className="text-white">{pages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rate</span>
                <span className="text-white">₹{PRICE_PER_PAGE[printType]} / page</span>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-3 font-display text-base font-bold text-white">
                <span>Total</span>
                <span>₹{printTotal.toFixed(2)}</span>
              </div>
            </div>

            <PaymentModePicker
              paymentMode={printPayment}
              setPaymentMode={setPrintPayment}
              payableNow={printTotal}
              cashRemainder={printTotal}
            />

            <button
              onClick={startPrintPayment}
              disabled={placing}
              className="w-full rounded-xl bg-marigold-500 py-3 text-sm font-bold text-midnight-950 transition hover:bg-marigold-400 disabled:opacity-50"
            >
              {DEMO_SKIP_PAYMENT ? (placing ? 'Placing order…' : 'Place order') : 'Continue to payment'}
            </button>
          </div>
        </div>
      )}

      {pending && (
        <PaymentModal
          pending={pending}
          onConfirm={confirmPayment}
          onClose={() => setPending(null)}
          submitting={placing}
          error={payError}
        />
      )}

      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
