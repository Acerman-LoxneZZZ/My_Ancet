import * as THREE from "three";

/** These materials are polished, so sample the refracted scene without a rough-glass blur. */
export function clearTransmission(material: THREE.MeshPhysicalMaterial) {
  const previousCompile = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  const transmission = THREE.ShaderChunk.transmission_pars_fragment.replace(
    "return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );",
    "return textureLod( transmissionSamplerMap, fragCoord.xy, 0.0 );",
  );
  material.onBeforeCompile = function (shader, renderer) {
    previousCompile.call(this, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace("#include <transmission_pars_fragment>", transmission);
  };
  material.customProgramCacheKey = () => `${previousKey}/clear-transmission-v1`;
}

/** Small deterministic material maps, not raster scene backdrops. */
export function createAtelierMaterials() {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const own = <T extends THREE.Material>(value: T): T => {
    materials.add(value);
    return value;
  };
  const size = 256;
  const hash = (x: number, y: number) => {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const u = x - ix, v = y - iy;
    const a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), a),
      THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), a), b,
    );
  };
  function map(sample: (x: number, y: number) => number, repeats = 1) {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const at = (y * size + x) * 4;
      const value = Math.round(THREE.MathUtils.clamp(sample(x, y), 0, 1) * 255);
      data[at] = data[at + 1] = data[at + 2] = value;
      data[at + 3] = 255;
    }
    const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.magFilter = THREE.LinearFilter;
    result.minFilter = THREE.LinearMipmapLinearFilter;
    result.generateMipmaps = true;
    result.repeat.set(repeats, repeats);
    result.needsUpdate = true;
    textures.add(result);
    return result;
  }
  const brushing = map((x, y) =>
    0.77 + noise(x * 0.018, y * 1.7) * 0.13 + hash(x, y) * 0.07);
  brushing.name = "Fine directional machining / roughness";
  const machining = map((x, y) =>
    0.49 + (noise(x * 0.025, y * 1.9) - 0.5) * 0.13 + hash(x, y) * 0.025);
  const stone = map((x, y) => {
    const cloud = noise(x * 0.025, y * 0.025) * 0.45
      + noise(x * 0.11, y * 0.11) * 0.3 + noise(x * 0.48, y * 0.48) * 0.25;
    return 0.38 + cloud * 0.27 + hash(x, y) * 0.025;
  });
  stone.name = "Honed obsidian / micro surface";
  const stoneRoughness = map((x, y) =>
    0.64 + noise(x * 0.035, y * 0.04) * 0.18 + hash(x, y) * 0.04);
  const silver = own(new THREE.MeshPhysicalMaterial({
    name: "Machined titanium / directional grain",
    color: "#a6b0b6", metalness: 1, roughness: 0.30,
    roughnessMap: brushing, bumpMap: machining, bumpScale: 0.0006,
    anisotropy: 0.35, anisotropyRotation: Math.PI / 2,
    envMapIntensity: 0.95, clearcoat: 0,
  }));
  const steel = own(new THREE.MeshPhysicalMaterial({
    name: "Deep gunmetal / brushed cavity",
    color: "#273039", metalness: 0.92, roughness: 0.34,
    roughnessMap: brushing, bumpMap: machining, bumpScale: 0.0006,
    envMapIntensity: 0.9,
  }));
  const black = own(new THREE.MeshStandardMaterial({
    name: "Oxidised steel / architectural recess",
    color: "#121a20", metalness: 0.67, roughness: 0.48,
    roughnessMap: brushing, bumpMap: machining, bumpScale: 0.001,
  }));
  const brass = own(new THREE.MeshPhysicalMaterial({
    name: "Warm cut brass / satin",
    color: "#a28a57", metalness: 1, roughness: 0.29,
    roughnessMap: brushing, bumpMap: machining, bumpScale: 0.0004,
    anisotropy: 0.28, envMapIntensity: 1.2,
  }));
  const polished = own(new THREE.MeshPhysicalMaterial({
    name: "Polished brass chamfer",
    color: "#d1ad66", metalness: 1, roughness: 0.23,
    roughnessMap: brushing, envMapIntensity: 0.9,
  }));
  const stoneMaterial = own(new THREE.MeshPhysicalMaterial({
    name: "Black mineral / polished and honed",
    color: "#20272c", metalness: 0.22, roughness: 0.26,
    roughnessMap: stoneRoughness, bumpMap: stone, bumpScale: 0.035,
    clearcoat: 0.55, clearcoatRoughness: 0.2,
  }));
  const glow = own(new THREE.MeshBasicMaterial({
    name: "Architectural warm source", color: new THREE.Color("#d5b991").multiplyScalar(0.65),
    toneMapped: true,
  }));
  const coolGlow = own(new THREE.MeshBasicMaterial({
    name: "Architectural cold source", color: new THREE.Color("#bdd0df").multiplyScalar(0.65),
    toneMapped: true,
  }));
  return {
    silver, steel, black, brass, polished, stone: stoneMaterial,
    glow, coolGlow, brushing, machining, stoneMap: stone,
    own,
    dispose() {
      materials.forEach(value => value.dispose());
      textures.forEach(value => value.dispose());
      materials.clear();
      textures.clear();
    },
  };
}

export type AtelierMaterials = ReturnType<typeof createAtelierMaterials>;
