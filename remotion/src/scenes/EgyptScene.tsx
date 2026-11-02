import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ProjectHeading, SceneShell, SourceNote, SourceScreen } from '../SceneShell';
import { ease, serif } from '../theme';

export function EgyptScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <SceneShell>
    <ProjectHeading number="3" title="Египет" titleFont={serif} detail="Путешествие сквозь тысячелетия в семи главах" />
    <SourceScreen file="egypt-original.jpg" style={{ left: 96, top: 288, width: 1216, height: 688 }} />
    <div style={{ position: 'absolute', left: 1344, top: 328, width: 480, height: 600, overflow: 'hidden' }}>
      <SourceScreen file="egypt-landscape.png" style={{ left: -480, top: 0, width: 1440, height: 600 }} />
      <SourceScreen file="egypt-gateway.png" style={{ left: -80, top: 0, width: 1248, height: 616, scale: interpolate(frame, [0, 3.5 * fps], [1, 1.035], { extrapolateRight: 'clamp', easing: Easing.bezier(...ease) }) }} />
    </div>
    <SourceNote>Оригинальный экран экспозиции</SourceNote>
    <SourceNote left={1360} top={984}>Исходный резной портал</SourceNote>
  </SceneShell>;
}
