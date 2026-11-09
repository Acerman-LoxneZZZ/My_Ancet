import type { CSSProperties } from 'react';

export function LoadingDial() {
  return <div className="loader-dial" aria-hidden="true">
    <span className="loader-sweep" />
    <span className="loader-rotor" />
  </div>;
}

export function LoadingScreen({ progress, complete }: { progress: number; complete: boolean }) {
  const percent = Math.min(100, Math.max(0, Math.round(progress)));
  return <div className={`journey-loader${complete ? ' is-complete' : ''}`} aria-hidden={complete || undefined} style={{ '--load': percent / 100 } as CSSProperties}>
    <div className="loader-top"><span>КАРПОВ</span><span>Дизайн / Движение / Код</span></div>
    <div className="loader-assembly" aria-hidden="true">
      <span className="loader-coordinate loader-coordinate-a">01 / МАТЕРИАЛ</span>
      <LoadingDial />
      <span className="loader-coordinate loader-coordinate-b">02 / ПРОСТРАНСТВО</span>
    </div>
    <div className="loader-bottom">
      <div className="loader-caption"><span>Миры под поверхностью</span><small>{percent < 80 ? 'Собираем пространство' : percent < 100 ? 'Готовим свет и экспонаты' : 'Пространство открыто'}</small></div>
      <div className="loader-percent" role="progressbar" aria-label="Загрузка галереи" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span>{String(percent).padStart(2, '0')}</span><small>%</small></div>
      <div className="loader-track" aria-hidden="true"><i /></div>
    </div>
  </div>;
}
