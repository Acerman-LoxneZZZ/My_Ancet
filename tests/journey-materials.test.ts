import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createAtelierMaterials } from '../src/experience/journey/materials';

const mapsOf = (library: ReturnType<typeof createAtelierMaterials>) =>
  [library.brushing, library.machining, library.stoneMap, library.stone.roughnessMap!];

describe('shared gallery surface maps', () => {
  it('shares maps while keeping the hall and exhibit materials independent', () => {
    const hall = createAtelierMaterials(), exhibits = createAtelierMaterials();
    try {
      mapsOf(hall).forEach((map, index) => expect(map).toBe(mapsOf(exhibits)[index]));
      expect(hall.silver).not.toBe(exhibits.silver);
      hall.silver.color.set('#ff0000');
      expect(exhibits.silver.color.getHexString()).toBe('a6b0b6');
    } finally { hall.dispose(); exhibits.dispose(); }
  });

  it('retains maps for remaining owners and releases each once after the final owner leaves', () => {
    const hall = createAtelierMaterials(), exhibits = createAtelierMaterials();
    const maps = mapsOf(hall);
    const dispose = maps.map(map => vi.spyOn(map, 'dispose'));
    try {
      hall.dispose();
      hall.dispose();
      dispose.forEach(spy => expect(spy).not.toHaveBeenCalled());
      exhibits.dispose();
      exhibits.dispose();
      dispose.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    } finally { hall.dispose(); exhibits.dispose(); }
    const next = createAtelierMaterials();
    try { mapsOf(next).forEach((map, index) => expect(map).not.toBe(maps[index])); }
    finally { next.dispose(); }
  });

  it('preserves the original pixels, resolution, filtering and mipmaps', () => {
    const library = createAtelierMaterials();
    try {
      const hashes = mapsOf(library).map(map => {
        expect([map.image.width, map.image.height]).toEqual([256, 256]);
        expect([map.wrapS, map.wrapT, map.minFilter, map.magFilter, map.generateMipmaps])
          .toEqual([1000, 1000, 1008, 1006, true]);
        return createHash('sha256').update(map.image.data).digest('hex');
      });
      expect(hashes).toEqual([
        '90bc6a149157df171fd0f20d5c279c72cf0bb27e4add9f3816ea33b92ca14683',
        '86a71cd8b569bd4148129ab1a26998c095fa2c393132db30ce0bc903f46bf2ab',
        'da52454db19417667af93539d4624bc51bb7d60692b71f62e3b18a7897f9de4a',
        '3ad6ed897527ca588decc9b0f6ee570b6e9bea0cffa5aeede0ddb8722baff18f',
      ]);
    } finally { library.dispose(); }
  });
});
