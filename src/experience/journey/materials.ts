import * as THREE from "three";

/** Blend over the full-resolution scene, with a stronger tint at grazing angles. */
export function createClearGlass(name: string, sweep?: { height: { value: number }; intensity: { value: number } }) {
  const material = new THREE.MeshPhysicalMaterial({
    name, color: "#b7cfdd", roughness: 0.28, opacity: 0.035,
    transparent: true, depthWrite: false,
    specularIntensity: 0.42, envMapIntensity: 0.5,
  });
  material.onBeforeCompile = shader => {
    if (sweep) {
      shader.uniforms.sweepHeight = sweep.height;
      shader.uniforms.sweepIntensity = sweep.intensity;
      shader.vertexShader = "varying float crystalHeight;\n" + shader.vertexShader
        .replace("#include <begin_vertex>", "#include <begin_vertex>\ncrystalHeight = position.y;");
      shader.fragmentShader = `
        varying float crystalHeight;
        uniform float sweepHeight;
        uniform float sweepIntensity;
      ` + shader.fragmentShader;
    }
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
      diffuseColor.a += 0.42 * pow(1.0 - facing, 3.0);
      ${sweep ? `
        float streak = (1.0 - smoothstep(0.025, 0.21, abs(crystalHeight - sweepHeight))) * sweepIntensity;
        outgoingLight += vec3(0.54, 0.72, 0.87) * streak;
        diffuseColor.a += 0.27 * streak;
      ` : ""}
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => sweep ? "crystal-sweep" : "crystal";
  return material;
}

/** Identical surface maps are generated and uploaded once per active gallery. */
function createAtelierMaps() {
  const textures = new Set<THREE.Texture>();
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
  return {
    brushing, machining, stone, stoneRoughness,
    dispose() { textures.forEach(texture => texture.dispose()); textures.clear(); },
  };
}

let sharedMaps: { maps: ReturnType<typeof createAtelierMaps>; owners: number } | undefined;

/** Materials stay independent; only the unchanged surface maps share ownership. */
export function createAtelierMaterials() {
  const library = sharedMaps ??= { maps: createAtelierMaps(), owners: 0 };
  library.owners++;
  const { brushing, machining, stone, stoneRoughness } = library.maps;
  const materials = new Set<THREE.Material>();
  let disposed = false;
  const own = <T extends THREE.Material>(value: T): T => {
    materials.add(value);
    return value;
  };
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
  const brass = own(new THREE.MeshStandardMaterial({
    name: "Satin brass / gear teeth and spokes",
    color: "#92794c", metalness: 0.66, roughness: 0.60,
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
  const trim = own(new THREE.MeshStandardMaterial({
    name: "Satin gunmetal trim", color: "#38444c",
    metalness: 0.68, roughness: 0.48, envMapIntensity: 0.62,
  }));
  const mechanismFinishes = new Map<THREE.Material, THREE.Material>();
  for (const source of [silver, steel, black, brass, polished]) {
    mechanismFinishes.set(source, own(new THREE.MeshPhysicalMaterial({
      name: `${source.name} / diffuse mechanism finish`,
      color: source.color.clone().multiplyScalar(0.75),
      specularIntensity: 0, envMapIntensity: 0.6,
    })));
  }
  return {
    silver, steel, black, brass, polished, stone: stoneMaterial,
    trim, brushing, machining, stoneMap: stone, mechanismFinishes,
    own,
    dispose() {
      if (disposed) return;
      disposed = true;
      materials.forEach(value => value.dispose());
      materials.clear();
      if (--library.owners === 0) {
        if (sharedMaps === library) sharedMaps = undefined;
        library.maps.dispose();
      }
    },
  };
}

export type AtelierMaterials = ReturnType<typeof createAtelierMaterials>;
