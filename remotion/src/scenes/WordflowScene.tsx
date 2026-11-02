import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ProjectHeading, SceneShell, SourceScreen } from '../SceneShell';
import { ease, palette } from '../theme';

export function WordflowScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <SceneShell>
    <ProjectHeading number="4" title="Wordflow" detail="Карточки слов, ответы и прогресс" />
    <div style={{ position: 'absolute', left: 96, top: 352, width: 640 }}>
      <h2 style={{ margin: 0, fontSize: 80, lineHeight: 1.18, fontWeight: 400 }}>Слово<br />Ответ<br />Прогресс</h2>
      <p style={{ marginTop: 48, width: 560, fontSize: 32, lineHeight: 1.5, color: palette.secondary }}>Оригинальный интерфейс<br />на синтетическом наборе слов</p>
    </div>
    <SourceScreen file="wordflow-original.jpg" style={{ left: 856, top: 176, width: 384, height: 832 }} />
    <SourceScreen file="wordflow-dictionary.jpg" style={{ left: 1296, top: 288, width: 328, height: 712, opacity: interpolate(frame, [0.6 * fps, 1.1 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(...ease) }), translate: `0px ${interpolate(frame, [0.6 * fps, 1.1 * fps], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(...ease) })}px` }} />
  </SceneShell>;
}
