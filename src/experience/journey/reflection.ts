import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

/** One small shared reflection pass. Glass deliberately has no transmission pass. */
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
        vec2 spread = vec2(0.0017, 0.003);
        vec3 reflected = texture2D(tDiffuse, uv).rgb * 0.40;
        reflected += texture2D(tDiffuse, uv + vec2(spread.x, 0.0)).rgb * 0.15;
        reflected += texture2D(tDiffuse, uv - vec2(spread.x, 0.0)).rgb * 0.15;
        reflected += texture2D(tDiffuse, uv + vec2(0.0, spread.y)).rgb * 0.15;
        reflected += texture2D(tDiffuse, uv - vec2(0.0, spread.y)).rgb * 0.15;
        vec3 eye = normalize(cameraPosition - vWorldPosition);
        float grazing = pow(1.0 - abs(eye.y), 3.0);
        float satin = 0.985 + 0.015 * sin(vWorldPosition.x * 183.0 + sin(vWorldPosition.z * 11.0));
        gl_FragColor = vec4(vec3(0.004,0.007,0.009) + reflected * mix(0.24, 0.62, grazing) * satin, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  };
  const floor = new Reflector(geometry, {
    textureWidth: 640, textureHeight: 384, clipBias: 0.003,
    color: 0x5a666f, multisample: 0, shader,
  });
  floor.name = "Journey / shared satin floor reflection";
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.035, -66);
  return {
    floor,
    fit(aspect: number) { floor.visible = aspect >= 1.1; },
    dispose() { floor.removeFromParent(); floor.dispose(); geometry.dispose(); },
  };
}
