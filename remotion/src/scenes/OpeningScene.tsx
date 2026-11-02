import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { WorldShot } from '../adapters/WorldShot';
import { SceneShell } from '../SceneShell';
import { palette, ease } from '../theme';

export function OpeningScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <SceneShell>
    <WorldShot worldId="monolith" width={1120} height={1040} style={{ left: 800, top: 20 }} progress={interpolate(frame, [0.4 * fps, 2.9 * fps], [0.08, 0.76], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(...ease) })} />
    <div style={{ position: 'absolute', left: 96, top: 80, fontSize: 36 }}>LOXNE</div>
    <div style={{ position: 'absolute', left: 96, top: 312, width: 832, opacity: interpolate(frame, [0, 0.4 * fps], [0.5, 1], { extrapolateRight: 'clamp' }) }}>
      <h1 style={{ margin: 0, fontSize: 112, fontWeight: 400, letterSpacing: '-0.035em', lineHeight: 1.08 }}>Миры под<br />поверхностью</h1>
      <p style={{ marginTop: 40, fontSize: 36, lineHeight: 1.45, color: palette.secondary }}>Четыре сайта<br />Дизайн, движение и код</p>
    </div>
    <div style={{ position: 'absolute', left: 96, bottom: 80, fontSize: 28, color: palette.secondary }}>Выбранные работы · 2026</div>
  </SceneShell>;
}
