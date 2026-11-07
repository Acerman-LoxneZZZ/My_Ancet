import type { CSSProperties } from 'react';

export function LoadingScreen({ progress, complete }: { progress: number; complete: boolean }) {
  const percent = Math.min(100, Math.max(0, Math.round(progress)));
  return <div className={`journey-loader${complete ? ' is-complete' : ''}`} aria-hidden={complete || undefined} style={{ '--load': percent / 100 } as CSSProperties}>
    <div className="loader-top"><span>КАРПОВ</span><span>Дизайн / Движение / Код</span></div>
    <div className="loader-assembly" aria-hidden="true">
      <span className="loader-coordinate loader-coordinate-a">01 / МАТЕРИАЛ</span>
      <svg className="loader-drawing" viewBox="0 0 320 320" fill="none">
        <path className="loader-grid" d="M0 80h320M0 160h320M0 240h320M80 0v320M160 0v320M240 0v320" />
        <circle className="loader-orbit" cx="160" cy="160" r="135" strokeDasharray="1 12" />
        <g className="loader-cog"><circle cx="160" cy="160" r="57" /><circle cx="160" cy="160" r="45" strokeDasharray="2 9" /><path d="M160 103v114M103 160h114M120 120l80 80M120 200l80-80" /><circle cx="160" cy="160" r="8" /></g>
        <path className="loader-letter loader-letter-left" d="M67 56h28v208H67z" />
        <path className="loader-letter loader-letter-right" d="M225 56h28v208h-28z" />
        <path className="loader-letter loader-letter-diagonal" d="m95 214 130-158v50L95 264z" />
        <path className="loader-register" d="M5 25V5h20m270 0h20v20M5 295v20h20m270 0h20v-20" />
      </svg>
      <span className="loader-coordinate loader-coordinate-b">02 / ПРОСТРАНСТВО</span>
    </div>
    <div className="loader-bottom">
      <div className="loader-caption"><span>Миры под поверхностью</span><small>{percent < 80 ? 'Собираем пространство' : percent < 100 ? 'Готовим свет и экспонаты' : 'Пространство открыто'}</small></div>
      <div className="loader-percent" role="progressbar" aria-label="Загрузка галереи" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span>{String(percent).padStart(2, '0')}</span><small>%</small></div>
      <div className="loader-track" aria-hidden="true"><i /></div>
    </div>
  </div>;
}
