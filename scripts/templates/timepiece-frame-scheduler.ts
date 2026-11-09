type Ticker = { add(callback: () => void): unknown; remove(callback: () => void): unknown };

/** Coalesce invalidations after Lenis on the same ticker; sleep when settled. */
export function createWatchFrameScheduler(ticker: Ticker, render: () => void) {
  let pending = false, listening = false;
  const cancel = () => {
    pending = false;
    if (listening) ticker.remove(tick);
    listening = false;
  };
  const tick = () => {
    if (!pending) return;
    pending = false;
    try { render(); }
    finally { if (!pending) cancel(); }
  };
  return {
    request() {
      pending = true;
      if (!listening) { listening = true; ticker.add(tick); }
      return 1;
    },
    cancel,
  };
}
