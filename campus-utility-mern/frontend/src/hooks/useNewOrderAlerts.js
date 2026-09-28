import { useCallback, useEffect, useRef, useState } from 'react';

let audioCtx = null;

// Browsers block sound/speech until the user has clicked something on the page,
// so this is called from the "Turn on alerts" button click.
function unlockAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (err) {
    // the chime is a nice-to-have, voice alone still works
  }
}

// Short two-note chime generated in code, so there is no audio file to ship.
function chime() {
  try {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const start = now + i * 0.18;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  } catch (err) {
    // ignore - sound is optional
  }
}

// Picks a Hindi voice if the device has one (most Android phones and Chrome on
// Windows do); otherwise falls back to an Indian-English voice.
function pickVoice() {
  try {
    const voices = window.speechSynthesis.getVoices();
    const hindi = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('hi'));
    if (hindi) return { voice: hindi, lang: 'hi-IN' };
    const enIn = voices.find((v) => v.lang && v.lang.toLowerCase().replace('_', '-') === 'en-in');
    if (enIn) return { voice: enIn, lang: 'en-IN' };
  } catch (err) {
    // ignore
  }
  return { voice: null, lang: 'en-IN' };
}

// some browsers load their voice list lazily - touch it once early
try {
  window.speechSynthesis?.getVoices();
  window.speechSynthesis?.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
} catch (err) {
  // ignore
}

function speak(hindiText, englishText) {
  try {
    if (!('speechSynthesis' in window)) return;
    const { voice, lang } = pickVoice();
    const text = lang === 'hi-IN' ? hindiText : englishText || hindiText;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance); // several new orders queue up in order
  } catch (err) {
    // ignore - the on-screen queue still updates
  }
}

// System pop-up notification. Only works on https or localhost and only after the
// user allows it, so it is silently skipped anywhere else.
function showNotification(title, body) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    new Notification(title, { body });
  } catch (err) {
    // some mobile browsers only allow notifications through a service worker
  }
}

// Builds what gets read aloud, in Hindi (for a Hindi voice) and English (fallback).
export function describeOrderBoth(order) {
  const firstName = (order.user_name || '').split(' ')[0];
  const token = String(order.token_number || '').replace('-', ' ');

  let what;
  let whatHi;
  if (order.type === 'Food') {
    what = (order.items || []).map((it) => `${it.quantity} ${it.item_name}`).join(', ');
    whatHi = what;
  } else {
    const job = order.print_job;
    what = job
      ? `Print job, ${job.pages} pages, ${job.print_type === 'Color' ? 'colour' : 'black and white'}`
      : 'Print job';
    whatHi = job
      ? `प्रिंट का ऑर्डर, ${job.pages} पेज, ${job.print_type === 'Color' ? 'रंगीन' : 'ब्लैक एंड व्हाइट'}`
      : 'प्रिंट का ऑर्डर';
  }

  const online = Math.round(order.amount_due_online || 0);
  const cash = Math.round(order.amount_due_at_counter || 0);
  const isDemo = String(order.payment_ref || '').startsWith('DEMO');

  const en =
    `New order, token ${token}${firstName ? `, from ${firstName}` : ''}. ${what}. ` +
    (order.payment_mode === 'Cash'
      ? `Cash order. Collect ${cash} rupees at the counter.`
      : isDemo
        ? 'Order confirmed.'
        : `Payment done online, ${online} rupees.`);

  const hi =
    `नया ऑर्डर आया है। टोकन ${token}${firstName ? `, ${firstName} का` : ''}। ${whatHi}। ` +
    (order.payment_mode === 'Cash'
      ? `कैश ऑर्डर है, काउंटर पर ${cash} रुपये लेने हैं।`
      : isDemo
        ? 'ऑर्डर कन्फर्म है।'
        : `ऑनलाइन पेमेंट हो गया, ${online} रुपये।`);

  return { en, hi };
}

// kept for anything that imports the old name
export function describeOrder(order) {
  return describeOrderBoth(order).en;
}

// Returns the orders not seen before, and remembers them.
export function splitFresh(seen, orders) {
  const fresh = [];
  for (const order of orders) {
    if (!seen.has(order._id)) {
      seen.add(order._id);
      fresh.push(order);
    }
  }
  return fresh;
}

function announce(order) {
  const { en, hi } = describeOrderBoth(order);
  chime();
  // small pause so the chime finishes before the voice starts
  setTimeout(() => speak(hi, en), 700);
  showNotification(`New order ${order.token_number}`, en);
}

// `ready` must turn true only after the first fetch finished, otherwise every
// order already waiting in the queue would be read out when the page opens.
export default function useNewOrderAlerts(orders, ready) {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const seenRef = useRef(null);

  useEffect(() => {
    if (!ready) return;
    if (seenRef.current === null) {
      seenRef.current = new Set(orders.map((o) => o._id));
      return;
    }
    const fresh = splitFresh(seenRef.current, orders);
    if (fresh.length > 0 && enabledRef.current) {
      fresh.forEach(announce);
    }
  }, [orders, ready]);

  // Browsers only allow sound after the person has touched the page once. Staff already
  // tapped things to log in, so alerts switch on by themselves.
  useEffect(() => {
    const auto = () => {
      if (!enabledRef.current) enable();
    };
    // the login tap already counts as interaction, so try straight away...
    if (navigator.userActivation?.hasBeenActive) auto();
    // ...and otherwise at the first click/tap on the page
    window.addEventListener('click', auto, { once: true });
    return () => window.removeEventListener('click', auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = useCallback(() => {
    unlockAudio();
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (err) {
      // notifications are optional
    }
    enabledRef.current = true;
    setEnabled(true);
    chime();
    speak('वॉइस अलर्ट चालू हो गए हैं', 'Voice alerts are on');
  }, []);

  const disable = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      // ignore
    }
  }, []);

  const test = useCallback(() => {
    announce({
      token_number: 'F-000',
      type: 'Food',
      user_name: 'Test Student',
      items: [{ quantity: 2, item_name: 'Burger' }],
      payment_mode: 'Online',
      amount_due_online: 100,
      amount_due_at_counter: 0,
    });
  }, []);

  return { enabled, enable, disable, test };
}
