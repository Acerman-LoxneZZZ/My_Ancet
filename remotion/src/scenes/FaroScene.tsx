import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { WorldShot } from '../adapters/WorldShot';
import { ProjectHeading, SceneShell, SourceNote, SourceScreen } from '../SceneShell';
import { ease } from '../theme';

export function FaroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <SceneShell>
    <ProjectHeading number="2" title="FARO" detail="3D-подача, меню и локальная корзина" />
    <SourceScreen file="faro-original.jpg" style={{ left: 96, top: 288, width: 1216, height: 688 }} />
    <SourceScreen file="faro-menu.jpg" style={{ left: 96, top: 288, width: 1216, height: 688, opacity: interpolate(frame, [1.35 * fps, 1.65 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(...ease) }) }} />
    <WorldShot worldId="faro" width={576} height={656} style={{ left: 1328, top: 300 }} progress={interpolate(frame, [0, 3.5 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    <SourceNote>Оригинальный интерфейс и меню</SourceNote>
    <SourceNote left={1360} top={984}>Демонстрационный проект</SourceNote>
  </SceneShell>;
}
