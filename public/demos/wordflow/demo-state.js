export const DEMO_NAMESPACE = 'loxne.wordflow.demo.v1:';

export function createDemoStorage(storage) {
  return Object.freeze({
    getItem(key) { return storage.getItem(DEMO_NAMESPACE + String(key)); },
    setItem(key, value) { storage.setItem(DEMO_NAMESPACE + String(key), String(value)); },
    removeItem(key) { storage.removeItem(DEMO_NAMESPACE + String(key)); },
    reset() {
      const ownedKeys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key?.startsWith(DEMO_NAMESPACE)) ownedKeys.push(key);
      }
      for (const key of ownedKeys) storage.removeItem(key);
    },
  });
}

export function createDemoState(model, {now = Date.now()} = {}) {
  const pairs = [
    ['surface', 'поверхность'], ['craft', 'мастерство'], ['motion', 'движение'],
    ['depth', 'глубина'], ['light', 'свет'], ['explore', 'исследовать'],
  ];
  const session = ids => ({queue: [...ids], learned: [], difficult: [], hinted: [], attempts: 0, streak: 0, bestStreak: 0});
  const ids = pairs.map((_, index) => model.BUILTIN_COUNT + index);
  return model.normalizeDocument({
    format: 'wordflow-backup', version: 1, builtinWords: [...model.BUILTIN_WORDS],
    customWords: pairs.map(([en, ru]) => ({en, ru, ipa: ''})),
    session: session(Array.from({length: model.BUILTIN_COUNT + pairs.length}, (_, index) => index)),
    collections: {
      items: [{id: 'deck-portfolio-demo', name: 'Миры под поверхностью · демо', wordIds: ids}],
      activeId: 'deck-portfolio-demo', sessions: {'deck-portfolio-demo': session(ids)},
    },
    preferences: {effects: true, shortcuts: true},
  }, now);
}

function createMemoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(String(key)) ?? null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
  };
}

export function bootWordflowDemo({window: browserWindow = window, document: doc = document} = {}) {
  if (browserWindow.__loxneWordflowDemoStarted) return;
  browserWindow.__loxneWordflowDemoStarted = true;
  const model = browserWindow.WordflowModel;
  if (!model) throw new Error('Original Wordflow model did not load');
  let storage;
  let persistent = true;
  try {
    storage = browserWindow.localStorage;
    const probe = DEMO_NAMESPACE + 'storage-probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
  } catch {
    storage = createMemoryStorage();
    persistent = false;
  }
  const adapter = createDemoStorage(storage);
  const requiredKeys = model.DATA_KEYS;
  if (adapter.getItem('initialized') !== '1' || requiredKeys.some(key => adapter.getItem(key) === null)) {
    const values = model.valuesFromDocument(createDemoState(model));
    for (const [key, value] of Object.entries(values)) adapter.setItem(key, value);
    adapter.setItem('initialized', '1');
  }
  browserWindow.WordflowStorage = adapter;

  browserWindow.addEventListener('message', event => {
    if (event.origin !== browserWindow.location.origin || event.source !== browserWindow.parent) return;
    if (!event.data || event.data.type !== 'loxne-wordflow-reset') return;
    adapter.reset();
    browserWindow.location.reload();
  });

  // The original hosted shell uses this same deferred-script bootstrap.
  for (const original of doc.querySelectorAll('script[type="text/wordflow-script"]')) {
    const script = doc.createElement('script');
    script.textContent = original.textContent;
    doc.body.append(script);
  }
  if (!browserWindow.WordflowData) throw new Error('Original Wordflow interface did not initialize');
  doc.documentElement.dataset.wordflowDemo = 'ready';
  if (!persistent) {
    browserWindow.WordflowData.notify('Демо работает в этой вкладке. После закрытия прогресс сбросится.');
  }
}

bootWordflowDemo();
