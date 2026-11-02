import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { WorldShot } from '../adapters/WorldShot';
import { SceneShell } from '../SceneShell';
import { ease, palette } from '../theme';

export function FinaleScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <SceneShell>
    <WorldShot worldId="monolith" width={944} height={960} style={{ left: 32, top: 60 }} finale progress={interpolate(frame, [0, 2.2 * fps], [0, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(...ease) })} />
    <div style={{ position: 'absolute', left: 1008, top: 352, width: 816 }}>
      <h1 style={{ margin: 0, fontSize: 128, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.03em' }}>LOXNE</h1>
      <p style={{ margin: '40px 0 0', fontSize: 44, lineHeight: 1.3 }}>Миры под поверхностью</p>
      <p style={{ margin: '64px 0 0', fontSize: 28, color: palette.secondary }}>github.com/Acerman-LoxneZZZ</p>
    </div>
  </SceneShell>;
}
