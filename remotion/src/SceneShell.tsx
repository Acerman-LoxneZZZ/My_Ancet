import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, CanvasImage, staticFile, useDelayRender, useVideoConfig } from 'remotion';
import { loadVideoFonts, palette, sans } from './theme';

export function SceneShell({ children }: { children: ReactNode }) {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender('Loading local portfolio typography'));
  useEffect(() => {
    loadVideoFonts().then(() => continueRender(handle)).catch(cancelRender);
  }, [handle, continueRender, cancelRender]);
  return (
    <AbsoluteFill style={{ background: palette.background, color: palette.text, fontFamily: sans, fontWeight: 400, fontSynthesis: 'none', overflow: 'hidden' }}>
      {children}
    </AbsoluteFill>
  );
}

export function ProjectHeading({ number, title, detail, titleFont = sans }: {
  number: string;
  title: string;
  detail: string;
  titleFont?: string;
}) {
  return <>
    <div style={{ position: 'absolute', left: 96, top: 64, fontSize: 28, color: palette.secondary }}>LOXNE</div>
    <div style={{ position: 'absolute', right: 96, top: 64, fontSize: 28, color: palette.secondary, fontVariantNumeric: 'tabular-nums' }}>{number} / 4</div>
    <div style={{ position: 'absolute', left: 96, right: 96, top: 128, height: 1, background: palette.line }} />
    <h1 style={{ position: 'absolute', left: 96, top: 160, margin: 0, fontFamily: titleFont, fontSize: 80, lineHeight: 1.1, fontWeight: 400 }}>{title}</h1>
    <p style={{ position: 'absolute', right: 96, top: 172, width: 520, margin: 0, fontSize: 28, lineHeight: 1.4, color: palette.secondary }}>{detail}</p>
  </>;
}

export function SourceScreen({ file, style }: { file: string; style?: CSSProperties }) {
  const { fps } = useVideoConfig();
  return <CanvasImage
    src={staticFile(`assets/images/${file}`)}
    premountFor={fps}
    style={{ position: 'absolute', display: 'block', objectFit: 'contain', ...style }}
  />;
}

export function SourceNote({ children, left = 96, top = 1008, width }: { children: ReactNode; left?: number; top?: number; width?: number }) {
  return <div style={{ position: 'absolute', left, top, width, fontSize: 24, lineHeight: 1.35, color: palette.secondary }}>{children}</div>;
}
