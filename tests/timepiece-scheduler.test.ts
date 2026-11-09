import { describe, expect, it, vi } from 'vitest';
import { createWatchFrameScheduler } from '../scripts/templates/timepiece-frame-scheduler';

function fixture() {
  const listeners: (() => void)[] = [];
  let index = -1;
  const ticker = {
    add(callback: () => void) { listeners.push(callback); },
    remove(callback: () => void) { const found = listeners.indexOf(callback); if (found >= 0) { listeners.splice(found, 1); if (found <= index) index--; } },
  };
  const tick = () => { try { for (index = 0; index < listeners.length; index++) listeners[index](); } finally { index = -1; } };
  return { ticker, tick, listeners };
}

describe('watch frames on the scroll ticker', () => {
  it('paints each new scroll pose once per tick, using the latest value', () => {
    const f = fixture();
    let progress = 0;
    const painted: number[] = [];
    const scheduler = createWatchFrameScheduler(f.ticker, () => painted.push(progress));
    const scroll = () => {
      progress += 1 / 120;
      scheduler.request(); scheduler.request();
    };
    f.ticker.add(scroll);
    for (let frame = 1; frame <= 120; frame++) { f.tick(); expect(painted.at(-1)).toBe(progress); }
    f.ticker.remove(scroll);
    expect(painted).toHaveLength(120);
    expect(painted.at(-1)).toBeCloseTo(1);
    expect(f.listeners).toHaveLength(0);
  });

  it('keeps camera transitions on following ticks without recursive rendering', () => {
    const f = fixture();
    let frames = 0;
    const scheduler = createWatchFrameScheduler(f.ticker, () => { if (++frames < 3) scheduler.request(); });
    scheduler.request();
    f.tick(); expect(frames).toBe(1); expect(f.listeners).toHaveLength(1);
    f.tick(); expect(frames).toBe(2);
    f.tick(); expect(frames).toBe(3); expect(f.listeners).toHaveLength(0);
  });

  it('cancels pending work on hide/disposal and can resume later', () => {
    const f = fixture(), draw = vi.fn();
    const scheduler = createWatchFrameScheduler(f.ticker, draw);
    scheduler.request(); scheduler.cancel(); scheduler.cancel(); f.tick();
    expect(draw).not.toHaveBeenCalled();
    scheduler.request(); f.tick();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('releases its ticker callback after a render failure', () => {
    const f = fixture();
    const scheduler = createWatchFrameScheduler(f.ticker, () => { throw new Error('lost context'); });
    scheduler.request();
    expect(f.tick).toThrow('lost context');
    expect(f.listeners).toHaveLength(0);
  });
});
