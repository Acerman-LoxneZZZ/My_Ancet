import { TransitionSeries } from '@remotion/transitions';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { OpeningScene } from './scenes/OpeningScene';
import { TimepieceScene } from './scenes/TimepieceScene';
import { FaroScene } from './scenes/FaroScene';
import { EgyptScene } from './scenes/EgyptScene';
import { WordflowScene } from './scenes/WordflowScene';
import { FinaleScene } from './scenes/FinaleScene';
import { palette } from './theme';

function CutOverlay() {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: palette.background, opacity: interpolate(frame, [0, 7, 15], [0, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }} />;
}

export function PortfolioShowreel() {
  const { fps } = useVideoConfig();
  return <TransitionSeries>
    <TransitionSeries.Sequence name="Миры под поверхностью" durationInFrames={3 * fps} premountFor={fps}><OpeningScene /></TransitionSeries.Sequence>
    <TransitionSeries.Overlay durationInFrames={16} premountFor={fps}><CutOverlay /></TransitionSeries.Overlay>
    <TransitionSeries.Sequence name="Ход времени" durationInFrames={4 * fps} premountFor={fps}><TimepieceScene /></TransitionSeries.Sequence>
    <TransitionSeries.Overlay durationInFrames={16} premountFor={fps}><CutOverlay /></TransitionSeries.Overlay>
    <TransitionSeries.Sequence name="FARO" durationInFrames={4 * fps} premountFor={fps}><FaroScene /></TransitionSeries.Sequence>
    <TransitionSeries.Overlay durationInFrames={16} premountFor={fps}><CutOverlay /></TransitionSeries.Overlay>
    <TransitionSeries.Sequence name="Египет" durationInFrames={4 * fps} premountFor={fps}><EgyptScene /></TransitionSeries.Sequence>
    <TransitionSeries.Overlay durationInFrames={16} premountFor={fps}><CutOverlay /></TransitionSeries.Overlay>
    <TransitionSeries.Sequence name="Wordflow" durationInFrames={4 * fps} premountFor={fps}><WordflowScene /></TransitionSeries.Sequence>
    <TransitionSeries.Overlay durationInFrames={16} premountFor={fps}><CutOverlay /></TransitionSeries.Overlay>
    <TransitionSeries.Sequence name="Возвращение" durationInFrames={3 * fps} premountFor={fps}><FinaleScene /></TransitionSeries.Sequence>
  </TransitionSeries>;
}
