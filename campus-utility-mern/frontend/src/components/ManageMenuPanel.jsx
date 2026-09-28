import { useEffect, useRef, useState } from 'react';
import {
  fetchCanteens,
  fetchMenu,
  createMenuItem,
  updateMenuItem,
  toggleMenuAvailability,
  deleteMenuItem,
  uploadMenuItemImage,
} from '../api';
import { useAuth } from '../context/AuthContext';
import TokenCard3D from './TokenCard3D';

export default function ManageMenuPanel() {
  const { user } = useAuth();
  const isStationary = user.role === 'stationary_admin';
  const label = isStationary ? 'shop item' : 'dish';

  const [canteen, setCanteen] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newItem, setNewItem] = useState({ item_name: '', price: '', image_url: '' });
  const [newImageUploading, setNewImageUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const newImageInputRef = useRef(null);

  const [editing, setEditing] = useState({}); // { [itemId]: { price, image_url, uploading } }
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    const canteens = await fetchCanteens();
    const target = canteens.find((c) =>
      isStationary ? c.name.toLowerCase().includes('stationary') : !c.name.toLowerCase().includes('stationary')
    );
    setCanteen(target || null);
    if (target) {
      const menu = await fetchMenu(target._id);
      setItems(menu);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewImageUploading(true);
    setError('');
    try {
      const { image_url } = await uploadMenuItemImage(file);
      setNewItem((prev) => ({ ...prev, image_url }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload that photo.');
    } finally {
      setNewImageUploading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!newItem.item_name.trim() || newItem.price === '' || Number(newItem.price) < 0) {
      setError('Enter a name and a valid, non-negative price.');
      return;
    }
    setAdding(true);
    try {
      const created = await createMenuItem({
        canteen_id: canteen._id,
        item_name: newItem.item_name.trim(),
        price: Number(newItem.price),
        image_url: newItem.image_url || null,
      });
      setItems((prev) => [...prev, created].sort((a, b) => a.item_name.localeCompare(b.item_name)));
      setNewItem({ item_name: '', price: '', image_url: '' });
      if (newImageInputRef.current) newImageInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || `Could not add this ${label}.`);
    } finally {
      setAdding(false);
    }
  };

  const startEditing = (item) => {
    setEditing((prev) => ({ ...prev, [item._id]: { price: String(item.price), image_url: item.image_url || '' } }));
  };

  const cancelEditing = (itemId) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleEditImageSelect = async (itemId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditing((prev) => ({ ...prev, [itemId]: { ...prev[itemId], uploading: true } }));
    setError('');
    try {
      const { image_url } = await uploadMenuItemImage(file);
      setEditing((prev) => ({ ...prev, [itemId]: { ...prev[itemId], image_url, uploading: false } }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not upload that photo.');
      setEditing((prev) => ({ ...prev, [itemId]: { ...prev[itemId], uploading: false } }));
    }
  };

  const saveEdits = async (itemId) => {
    const draft = editing[itemId];
    if (!draft || draft.price === '' || Number(draft.price) < 0) {
      setError('Enter a valid, non-negative price before saving.');
      return;
    }
    setSavingId(itemId);
    setError('');
    try {
      const updated = await updateMenuItem(itemId, { price: Number(draft.price), image_url: draft.image_url || null });
      setItems((prev) => prev.map((it) => (it._id === itemId ? updated : it)));
      cancelEditing(itemId);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save changes.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleAvailability = async (item) => {
    try {
      const updated = await toggleMenuAvailability(item._id);
      setItems((prev) => prev.map((it) => (it._id === item._id ? updated : it)));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update availability.');
    }
  };

  const removeItem = async (item) => {
    try {
      await deleteMenuItem(item._id);
      setItems((prev) => prev.filter((it) => it._id !== item._id));
    } catch (err) {
      setError(err.response?.data?.error || `Could not remove this ${label}.`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
      <div className="mb-8">
        <p className="font-display text-2xl font-extrabold text-white">
          {isStationary ? 'Manage shop items' : 'Manage menu'}
        </p>
        <p className="text-sm text-slate-400">
          Add new {label}s with a photo, adjust prices, and mark items out of stock — changes show up for students
          immediately.
        </p>
      </div>

      {error && <div className="mb-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

      <form
        onSubmit={handleAdd}
        className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-end"
      >
        <div className="flex items-center gap-3">
          <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-white/15 bg-midnight-900 text-center transition hover:border-marigold-500/60">
            <input ref={newImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleNewImageSelect} />
            {newImageUploading ? (
              <span className="text-[10px] text-slate-400">Uploading…</span>
            ) : newItem.image_url ? (
              <img src={newItem.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl text-slate-500">📷</span>
            )}
          </label>
        </div>

        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            New {label} name
          </label>
          <input
            value={newItem.item_name}
            onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-midnight-900 px-4 py-2.5 text-sm text-white outline-none focus:border-marigold-500"
            placeholder={isStationary ? 'Spiral Binding' : 'Paneer Roll'}
          />
        </div>
        <div className="sm:w-40">
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Price (₹)</label>
          <input
            type="number"
            min="0"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-midnight-900 px-4 py-2.5 text-sm text-white outline-none focus:border-marigold-500"
            placeholder="60"
          />
        </div>
        <button
          type="submit"
          disabled={adding || newImageUploading || !canteen}
          className="rounded-xl bg-marigold-500 px-6 py-2.5 text-sm font-bold text-midnight-950 transition hover:bg-marigold-400 disabled:opacity-50"
        >
          {adding ? 'Adding…' : `Add ${label}`}
        </button>
      </form>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
          Nothing here yet. Add the first {label} above.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isEditing = editing[item._id] !== undefined;
            const draft = editing[item._id];
            return (
              <TokenCard3D key={item._id}>
                <div
                  className={`flex h-full flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br from-midnight-800 to-midnight-900 ${
                    item.is_available ? 'border-white/10' : 'border-rose-500/30'
                  }`}
                >
                  <label className="relative block h-32 w-full cursor-pointer bg-midnight-950">
                    {isEditing && (
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleEditImageSelect(item._id, e)}
                      />
                    )}
                    {(isEditing ? draft.image_url : item.image_url) ? (
                      <img
                        src={isEditing ? draft.image_url : item.image_url}
                        alt={item.item_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-slate-600">
                        {isStationary ? '🧾' : '🍽️'}
                      </div>
                    )}
                    {isEditing && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-lg bg-midnight-950/80 px-2 py-1 text-[10px] text-white">
                        {draft.uploading ? 'Uploading…' : 'Tap to change photo'}
                      </span>
                    )}
                  </label>

                  <div className="p-5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-display text-sm font-semibold text-white">{item.item_name}</p>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            item.is_available ? 'bg-teal-500/20 text-teal-300' : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {item.is_available ? 'Available' : 'Out of stock'}
                        </span>
                      </div>

                      <div className="mt-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={draft.price}
                              onChange={(e) =>
                                setEditing((prev) => ({ ...prev, [item._id]: { ...prev[item._id], price: e.target.value } }))
                              }
                              className="w-20 rounded-lg border border-white/10 bg-midnight-950 px-2 py-1 text-sm text-white outline-none focus:border-marigold-500"
                            />
                          </div>
                        ) : (
                          <p className="font-display text-lg font-bold text-marigold-400">
                            ₹{Number(item.price).toFixed(0)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdits(item._id)}
                            disabled={savingId === item._id || draft.uploading}
                            className="rounded-lg bg-marigold-500 px-3 py-1.5 text-xs font-bold text-midnight-950 transition hover:bg-marigold-400 disabled:opacity-50"
                          >
                            {savingId === item._id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => cancelEditing(item._id)}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/20"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditing(item)}
                          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/20"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => toggleAvailability(item)}
                        className="rounded-lg bg-teal-500/20 px-3 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-500/30"
                      >
                        {item.is_available ? 'Mark out of stock' : 'Mark available'}
                      </button>
                      <button
                        onClick={() => removeItem(item)}
                        className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </TokenCard3D>
            );
          })}
        </div>
      )}
    </div>
  );
}
