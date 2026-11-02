import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { WorldShot } from '../adapters/WorldShot';
import { ProjectHeading, SceneShell, SourceNote, SourceScreen } from '../SceneShell';
import { ease, serif } from '../theme';

export function TimepieceScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <SceneShell>
    <ProjectHeading number="1" title="Ход времени" titleFont={serif} detail="Интерактивная экспозиция механических часов" />
    <SourceScreen file="timepiece-original.jpg" style={{ left: 96, top: 288, width: 1216, height: 688 }} />
    <WorldShot worldId="timepiece" width={576} height={656} style={{ left: 1328, top: 300 }} progress={interpolate(frame, [0.35 * fps, 2.8 * fps], [0.08, 0.72], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(...ease) })} />
    <SourceNote>Оригинальный интерфейс</SourceNote>
    <SourceNote left={1360} top={984}>47 деталей одного механизма</SourceNote>
  </SceneShell>;
}
