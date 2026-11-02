import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {mkdtemp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {basename, join, resolve, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createContext, runInContext} from 'node:vm';
import {buildWordflowDemo} from '../scripts/prepare-wordflow-demo.mjs';
import {createDemoState, createDemoStorage} from '../scripts/templates/wordflow-demo-state.mjs';

// TDD contract: the builder copies the original UI, never its server/profile data.
// The source snapshot is the audited, read-only .research/EnCard checkout.
// Missing future implementation imports are an intentional initial RED state.
const originalRoot = resolve('.research/EnCard');
const namespace = 'loxne.wordflow.demo.v1:';
const wordPairs = [
  ['surface', 'поверхность'], ['craft', 'мастерство'], ['motion', 'движение'],
  ['depth', 'глубина'], ['light', 'свет'], ['explore', 'исследовать'],
];
const originalAssets = [
  'public/wordflow-model.js', 'public/wordflow-activity.js',
  'public/wordflow-library.js', 'public/wordflow-library.css',
];
const expectedOutput = ['index.html', 'demo-state.js', ...originalAssets].sort();
const fixedNow = Date.parse('2026-11-02T12:00:00Z');
let temporaryRoot: string;
let sourceRoot: string;
let outputRoot: string;
let originalHtml: string;
let generatedHtml: string;
let model: any;
const sourceBytes = new Map<string, Buffer>();

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(String(key)) ?? null; }
  setItem(key: string, value: string) { this.values.set(String(key), String(value)); }
  removeItem(key: string) { this.values.delete(String(key)); }
  clear() { this.values.clear(); }
}

async function filesUnder(directory: string, prefix = ''): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await filesUnder(join(directory, entry.name), relative + '/'));
    else result.push(relative);
  }
  return result.sort();
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const styles = (html: string) => [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g)].map(match => match[1]);
const answerButtons = (html: string) => [...html.matchAll(/<button\b[^>]*data-answer="(?:no|hard|yes)"[^>]*>[\s\S]*?<\/button>/g)].map(match => match[0]);
const optionalTelegram = /<script>\s*\/\* Telegram integration is optional: the standalone file still works offline\. \*\/[\s\S]*?<\/script>/g;

beforeAll(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'loxne-wordflow-isolation-'));
  sourceRoot = join(temporaryRoot, 'source');
  outputRoot = join(temporaryRoot, 'output');
  await mkdir(join(sourceRoot, 'public'), {recursive: true});
  for (const relative of ['index.html', ...originalAssets]) {
    const bytes = await readFile(join(originalRoot, relative));
    sourceBytes.set(relative, bytes);
    await writeFile(join(sourceRoot, relative), bytes);
  }
  // Entirely synthetic forbidden files: no actual profile backup is ever read.
  for (const relative of ['backups/wordflow.sqlite', 'server/profile.mjs', '.openai/hosting.json', 'public/profile-client.js', 'public/sw.js']) {
    await mkdir(resolve(sourceRoot, relative, '..'), {recursive: true});
    await writeFile(join(sourceRoot, relative), 'SYNTHETIC_PRIVATE_PROFILE_MUST_NOT_SHIP');
  }
  originalHtml = sourceBytes.get('index.html')!.toString('utf8');
  const context = createContext({TextEncoder});
  runInContext(sourceBytes.get('public/wordflow-model.js')!.toString('utf8'), context);
  model = context.WordflowModel;
  await buildWordflowDemo({sourceRoot, outputRoot});
  generatedHtml = await readFile(join(outputRoot, 'index.html'), 'utf8');
});

afterAll(async () => {
  if (!temporaryRoot) return;
  const target = resolve(temporaryRoot);
  const allowedParent = resolve(tmpdir()) + sep;
  if (!target.startsWith(allowedParent) || !basename(target).startsWith('loxne-wordflow-isolation-')) {
    throw new Error('Refusing cleanup outside the generated test directory');
  }
  await rm(target, {recursive: true, force: true});
});

describe('preparing the original Wordflow UI for a public isolated demo', () => {
  it('ships only the approved UI files, even when the source contains private data and hosted bootstraps', async () => {
    expect(await filesUnder(outputRoot)).toEqual(expectedOutput);
    for (const relative of expectedOutput) {
      const text = await readFile(join(outputRoot, relative), 'utf8');
      expect(text).not.toContain('SYNTHETIC_PRIVATE_PROFILE_MUST_NOT_SHIP');
      expect(text).not.toMatch(/\/api\/profile|profile-client\.js|telegram\.org\/js\/telegram-web-app\.js/);
    }
  });

  it('keeps the source typography, main styles and all three original answer controls intact', () => {
    expect(styles(generatedHtml)).toEqual(styles(originalHtml));
    expect(styles(generatedHtml).length).toBeGreaterThan(0);
    expect(generatedHtml).toContain('Manrope');
    expect(generatedHtml).toContain('DM Serif Display');
    expect(generatedHtml).toContain('SIL OPEN FONT LICENSE');
    expect(answerButtons(generatedHtml)).toEqual(answerButtons(originalHtml));
    expect(answerButtons(generatedHtml)).toHaveLength(3);
    for (const label of ['Не знаю', 'Трудно', 'Знаю']) expect(answerButtons(generatedHtml).join('')).toContain(label);
    expect(generatedHtml).toMatch(/Локальн(?:ое|ая).*демо|Демонстрация/);
  });

  it('copies the real learning model, activity and dictionary modules byte for byte', async () => {
    for (const relative of originalAssets) {
      const actual = await readFile(join(outputRoot, relative));
      expect(sha256(actual)).toBe(sha256(sourceBytes.get(relative)!));
    }
  });

  it('defers the original inline programs until the isolated storage is installed', () => {
    const originalPrograms = [...originalHtml.replace(optionalTelegram, '').matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map(match => match[1].replace(/\blocalStorage\b/g, 'window.WordflowStorage'));
    const preparedPrograms = [...generatedHtml.matchAll(/<script\b[^>]*type=["']text\/wordflow-script["'][^>]*>([\s\S]*?)<\/script>/g)]
      .map(match => match[1]);
    expect(originalPrograms.length).toBeGreaterThan(0);
    expect(preparedPrograms).toEqual(originalPrograms);
    expect(generatedHtml).not.toMatch(/<script>\s*[\s\S]*?<\/script>/);
    expect(generatedHtml).toMatch(/<script\b(?=[^>]*type=["']module["'])(?=[^>]*src=["']\.\/demo-state\.js["'])[^>]*>/);
  });

  it('leaves every original source file unchanged and refuses an in-place preparation target', async () => {
    await expect(buildWordflowDemo({sourceRoot, outputRoot: sourceRoot})).rejects.toThrow();
    for (const [relative, bytes] of sourceBytes) {
      expect(sha256(await readFile(join(sourceRoot, relative)))).toBe(sha256(bytes));
      expect(sha256(await readFile(join(originalRoot, relative)))).toBe(sha256(bytes));
    }
    expect(await readFile(join(sourceRoot, 'backups/wordflow.sqlite'), 'utf8')).toBe('SYNTHETIC_PRIVATE_PROFILE_MUST_NOT_SHIP');
  });
});

describe('Wordflow demo storage boundaries', () => {
  it('reads and writes only its namespace, without falling back to another Wordflow profile', () => {
    const storage = new MemoryStorage();
    storage.setItem('wordflow.session.v1', 'unrelated standalone data');
    storage.setItem('wordflow.profile.synthetic-owner.v1', 'synthetic foreign profile');
    const demo = createDemoStorage(storage);
    expect(demo.getItem('wordflow.session.v1')).toBeNull();
    demo.setItem('wordflow.session.v1', 'demo progress');
    expect(storage.getItem(namespace + 'wordflow.session.v1')).toBe('demo progress');
    expect(storage.getItem('wordflow.session.v1')).toBe('unrelated standalone data');
    expect(createDemoStorage(storage).getItem('wordflow.session.v1')).toBe('demo progress');
    demo.removeItem('wordflow.session.v1');
    expect(demo.getItem('wordflow.session.v1')).toBeNull();
    expect(storage.getItem('wordflow.profile.synthetic-owner.v1')).toBe('synthetic foreign profile');
  });

  it('resets every demo key while preserving unrelated application data and similarly named namespaces', () => {
    const storage = new MemoryStorage();
    const foreign = [
      ['portfolio.motion', 'reduced'],
      ['wordflow.session.v1', 'standalone'],
      ['wordflow.profile.synthetic-owner.v1', 'profile'],
      ['loxne.wordflow.demo.v10:wordflow.session.v1', 'other version'],
    ];
    for (const [key,value] of foreign) storage.setItem(key,value);
    const clear = vi.spyOn(storage, 'clear');
    const demo = createDemoStorage(storage);
    for (const key of ['initialized', 'wordflow.session.v1', 'wordflow.collections.v1', 'future-key']) demo.setItem(key, 'demo-only');
    demo.reset();
    expect(clear).not.toHaveBeenCalled();
    expect(storage.length).toBe(foreign.length);
    for (const [key,value] of foreign) expect(storage.getItem(key)).toBe(value);
    expect(demo.getItem('initialized')).toBeNull();
    demo.reset();
    expect(storage.length).toBe(foreign.length);
  });
});

describe('synthetic state accepted by the original Wordflow validator', () => {
  it('starts with the six specified words, one usable collection and no invented learning history', () => {
    const normalizeDocument = vi.fn(model.normalizeDocument);
    const state = createDemoState({...model, normalizeDocument}, {now: fixedNow});
    expect(normalizeDocument).toHaveBeenCalled();
    expect(state).toEqual(model.normalizeDocument(state, fixedNow));
    expect(state.version).toBe(2);
    expect(state.customWords.map((word: {en: string; ru: string}) => [word.en, word.ru])).toEqual(wordPairs);
    expect(state.collections.items).toHaveLength(1);
    const deck = state.collections.items[0];
    expect(state.collections.activeId).toBe(deck.id);
    expect(deck.wordIds).toHaveLength(6);
    expect(state.collections.sessions[deck.id]).toMatchObject({
      queue: deck.wordIds, learned: [], difficult: [], hinted: [], attempts: 0, streak: 0, bestStreak: 0,
    });
    expect(state.activity).toEqual({startedAt: fixedNow, events: [], truncated: false});
    expect(state.builtinWords).toEqual([...model.BUILTIN_WORDS]);
    expect(state.session.queue).toHaveLength(model.BUILTIN_COUNT + 6);
    expect(state.session.learned).toEqual([]);
    expect(state).not.toHaveProperty('profile');
    expect(state).not.toHaveProperty('telegramId');
  });

  it('does not share mutable progress between newly created demos', () => {
    const first = createDemoState(model, {now: fixedNow});
    const second = createDemoState(model, {now: fixedNow});
    const firstSession = first.collections.sessions[first.collections.activeId];
    const answered = firstSession.queue.shift();
    firstSession.learned.push(answered);
    first.customWords[0].ru = 'changed only in the first demo';
    const secondSession = second.collections.sessions[second.collections.activeId];
    expect(secondSession.queue).toHaveLength(6);
    expect(secondSession.learned).toEqual([]);
    expect(second.customWords[0].ru).toBe('поверхность');
    expect(second).toEqual(model.normalizeDocument(second, fixedNow));
  });
});
