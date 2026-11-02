import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { staticFile, useCurrentFrame, useDelayRender, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createWorld } from '../../../src/experience/worlds';
import type { WorldId, WorldInstance } from '../../../src/experience/types';

type Props = {
  worldId: WorldId;
  progress: number;
  width: number;
  height: number;
  finale?: boolean;
  style?: CSSProperties;
};

function ApplyFrame({ world, width, height, progress, finale, onReady }: {
  world: WorldInstance; width: number; height: number; progress: number; finale: boolean; onReady: () => void;
}) {
  const { gl, advance } = useThree();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useLayoutEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    gl.setClearColor('#101112', 0);
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    room.dispose();
    // Rendering RoomEnvironment updates WebGL's clear state in Three r187.
    // Restore transparency after PMREM, before drawing the exhibition scene.
    gl.setClearColor('#101112', 0);
    world.scene.environment = environment.texture;
    return () => {
      world.scene.environment = null;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, world]);

  useLayoutEffect(() => {
    world.fit(width, height);
    world.update({ progress, time: frame / fps, pointer: [0, 0], reducedMotion: false, finale, impulse: 0 });
    // A synchronous first draw prevents the capture barrier releasing on an empty canvas.
    // ThreeCanvas performs its own frame draw after layout effects on subsequent frames.
    advance((frame / fps) * 1000);
    onReady();
  }, [advance, finale, fps, frame, height, onReady, progress, width, world]);
  return null;
}

export function WorldShot({ worldId, width, height, progress, finale = false, style }: Props) {
  const { fps } = useVideoConfig();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender(`Loading and drawing ${worldId}`, { timeoutInMilliseconds: 60000 }));
  const [world, setWorld] = useState<WorldInstance | null>(null);

  useEffect(() => {
    let active = true;
    let created: WorldInstance | undefined;
    createWorld(worldId, {
      resolveAsset: (path) => staticFile(`assets/${path}`),
      quality: { tier: 'mobile', dpr: 1, particles: 0, transmission: true },
    }).then((value) => {
      created = value;
      if (active) setWorld(value);
      else value.dispose();
    }).catch((error: unknown) => {
      if (active) cancelRender(error);
    });
    return () => {
      active = false;
      created?.dispose();
      continueRender(handle);
    };
  }, [cancelRender, continueRender, handle, worldId]);

  return <div style={{ position: 'absolute', width, height, ...style }}>
    {world ? <ThreeCanvas
      width={width}
      height={height}
      scene={world.scene}
      camera={world.camera}
      dpr={1}
      frameloop="never"
      gl={{ antialias: true, alpha: true }}
      premountFor={fps}
    >
      <ApplyFrame world={world} width={width} height={height} progress={progress} finale={finale} onReady={() => continueRender(handle)} />
    </ThreeCanvas> : null}
  </div>;
}
