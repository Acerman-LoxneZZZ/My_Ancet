import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { galleryFloor } from "./galleryRoute";
import { createEntranceShadowUniforms, entranceShadowGLSL, setEntranceShadow } from "./entranceShadow";

const reflectionLimits = [1440, 1152, 896];

/** A planar reflection under the mineral shadow-catching skin. */
export function createJourneyReflection(compact: boolean) {
  const geometry = new THREE.PlaneGeometry(galleryFloor.width, galleryFloor.depth);
  const shader = {
    uniforms: {
      color: { value: new THREE.Color(0x5a666f) },
      tDiffuse: { value: null as THREE.Texture | null },
      textureMatrix: { value: new THREE.Matrix4() },
      ...createEntranceShadowUniforms(),
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
      ${entranceShadowGLSL}
      void main() {
        vec2 uv = vUv.xy / vUv.w;
        vec3 eye = normalize(cameraPosition - vWorldPosition);
        vec3 reflected = texture2D(tDiffuse, uv).rgb;
        float grazing = pow(1.0 - abs(eye.y), 3.0);
        float peak = max(reflected.r, max(reflected.g, reflected.b));
        reflected /= 1.0 + 0.42 * peak;
        vec3 floorColor = vec3(0.004, 0.006, 0.009) + reflected * mix(0.34, 0.65, grazing);
        gl_FragColor = vec4(exposeEntrance(floorColor, vWorldPosition.xz), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };
  const floor = new Reflector(geometry, {
    clipBias: 0.003, color: 0x5a666f, multisample: compact ? 0 : 2, shader,
  });
  floor.name = "Journey / polished floor reflection";
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(galleryFloor.x, -0.035, galleryFloor.z);
  const shadowUniforms = (floor.material as THREE.ShaderMaterial).uniforms as ReturnType<typeof createEntranceShadowUniforms>;
  setEntranceShadow(shadowUniforms, 0, 0);
  const renderReflection = floor.onBeforeRender;
  const lastView = new THREE.Matrix4();
  const lastProjection = new THREE.Matrix4();
  let primaryCamera: THREE.Camera | null = null;
  let refresh = true;
  let frameTime = 0;
  let lastRefresh = -Infinity;
  let quality = 0;
  floor.onBeforeRender = (...args) => {
    const [, , camera] = args;
    if (!refresh || camera !== primaryCamera) return;
    refresh = false;
    lastRefresh = frameTime;
    lastView.copy(camera.matrixWorld);
    lastProjection.copy(camera.projectionMatrix);
    renderReflection.apply(floor, args);
  };
  return {
    floor,
    setEntranceShadow(assembly: number, transfer: number) {
      if (assembly === shadowUniforms.entranceAssembly.value && transfer === shadowUniforms.entranceTransfer.value) return;
      setEntranceShadow(shadowUniforms, assembly, transfer);
    },
    prepare(camera: THREE.Camera, now: number, objectsChanged: boolean, invalidated: boolean) {
      primaryCamera = camera;
      frameTime = now;
      camera.updateWorldMatrix(true, false);
      // Camera movement always refreshes projection: no sliding mirror image.
      const viewChanged = !lastView.equals(camera.matrixWorld) || !lastProjection.equals(camera.projectionMatrix);
      if (viewChanged || invalidated || (objectsChanged && now - lastRefresh >= 50 + quality * 25)) refresh = true;
    },
    fit(width: number, height: number, level: number) {
      quality = level;
      const scale = Math.min(1, reflectionLimits[quality] / Math.max(width, height));
      floor.getRenderTarget().setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
      refresh = true;
    },
    dispose() { floor.removeFromParent(); floor.dispose(); geometry.dispose(); },
  };
}
