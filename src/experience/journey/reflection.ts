import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

/** A shared, softened planar reflection under the mineral shadow-catching skin. */
export function createJourneyReflection() {
  const geometry = new THREE.PlaneGeometry(38, 182);
  const shader = {
    uniforms: {
      color: { value: new THREE.Color(0x5a666f) },
      tDiffuse: { value: null as THREE.Texture | null },
      textureMatrix: { value: new THREE.Matrix4() },
    },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = textureMatrix * vec4(position, 1.0);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      varying vec4 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vec2 uv = vUv.xy / vUv.w;
        float grain = sin(vWorldPosition.x * 53. + sin(vWorldPosition.z * 39.));
        uv += vec2(grain, sin(vWorldPosition.z * 67.)) * .00022;
        vec2 spread = vec2(0.0013, 0.0022);
        vec3 reflected = texture2D(tDiffuse, uv).rgb * 0.32;
        reflected += texture2D(tDiffuse, uv + vec2(spread.x, 0.0)).rgb * 0.12;
        reflected += texture2D(tDiffuse, uv - vec2(spread.x, 0.0)).rgb * 0.12;
        reflected += texture2D(tDiffuse, uv + vec2(0.0, spread.y)).rgb * 0.12;
        reflected += texture2D(tDiffuse, uv - vec2(0.0, spread.y)).rgb * 0.12;
        reflected += texture2D(tDiffuse, uv + spread).rgb * 0.05;
        reflected += texture2D(tDiffuse, uv - spread).rgb * 0.05;
        reflected += texture2D(tDiffuse, uv + spread * vec2(1.,-1.)).rgb * 0.05;
        reflected += texture2D(tDiffuse, uv + spread * vec2(-1.,1.)).rgb * 0.05;
        vec3 eye = normalize(cameraPosition - vWorldPosition);
        float grazing = pow(1.0 - abs(eye.y), 3.0);
        float satin = 0.96 + 0.04 * sin(vWorldPosition.x * 21.0 + sin(vWorldPosition.z * 17.0));
        gl_FragColor = vec4(vec3(0.005,0.008,0.011) + reflected * mix(0.25, 0.66, grazing) * satin, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };
  const floor = new Reflector(geometry, {
    textureWidth: 1024, textureHeight: 640, clipBias: 0.003,
    color: 0x5a666f, multisample: 0, shader,
  });
  floor.name = "Journey / shared satin floor reflection";
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.035, -66);
  const renderReflection = floor.onBeforeRender;
  const lastView = new THREE.Matrix4();
  const lastProjection = new THREE.Matrix4();
  let primaryCamera: THREE.Camera | null = null;
  let refresh = true;
  let frameTime = 0;
  let lastRefresh = -Infinity;
  let quality = 0;
  // Three also draws opaque objects into the glass transmission buffer.
  // Reuse the mirror there instead of rendering the reflected scene twice.
  floor.onBeforeRender = (...args) => {
    const [renderer, , camera] = args;
    if (!refresh || camera !== primaryCamera) return;
    refresh = false;
    lastRefresh = frameTime;
    lastView.copy(camera.matrixWorld);
    lastProjection.copy(camera.projectionMatrix);
    const transmissionScale = renderer.transmissionResolutionScale;
    // The softened floor needs less refraction detail than the main crystal.
    renderer.transmissionResolutionScale = 0.5;
    try {
      renderReflection.apply(floor, args);
    } finally {
      renderer.transmissionResolutionScale = transmissionScale;
    }
  };
  return {
    floor,
    prepare(camera: THREE.Camera, now: number, objectsChanged: boolean, invalidated: boolean) {
      primaryCamera = camera;
      frameTime = now;
      camera.updateWorldMatrix(true, false);
      // Camera movement always refreshes projection: no sliding mirror image.
      const viewChanged = !lastView.equals(camera.matrixWorld) || !lastProjection.equals(camera.projectionMatrix);
      if (viewChanged || invalidated || (objectsChanged && now - lastRefresh >= 50 + quality * 25)) refresh = true;
    },
    setQuality(level: number) {
      const next = Math.max(0, Math.min(2, Math.round(level)));
      if (next === quality) return;
      quality = next;
      const width = [1024, 768, 512][quality];
      floor.getRenderTarget().setSize(width, width * 0.625);
      refresh = true;
    },
    fit(aspect: number) { floor.visible = aspect >= 1.1; refresh = true; },
    dispose() { floor.removeFromParent(); floor.dispose(); geometry.dispose(); },
  };
}
