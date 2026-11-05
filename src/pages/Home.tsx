import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { author, projects } from "../content/portfolio";
import { PortfolioLink } from "../navigation/NavigationProvider";
import { Arrow, Mark } from "../components/Icon";
import { ReactiveName } from "../components/ReactiveName";
import { FINALE_FROM, JOURNEY_LIMIT, JOURNEY_SCROLL_SVH, journeyChapters, chapterIndex, seekJourney } from "../experience/journey/chapters";

const JourneyCanvas = lazy(() => import("../components/JourneyCanvas"));
const smooth = (a: number, b: number, n: number) => {
  const t = Math.min(1, Math.max(0, (n - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const descriptions = ["Сорок семь деталей. Один механизм.", "Тесто, огонь и немного Италии.", "По ту сторону древнего портала.", "Большой мир начинается с одного слова."];

export function Home() {
  const root = useRef<HTMLElement>(null);
  const indexDialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [indexOpen, setIndexOpen] = useState(false);
  const [watchSetting, setWatchSetting] = useState(52);
  useEffect(() => {
    document.documentElement.classList.add("in-journey");
    return () => document.documentElement.classList.remove("in-journey");
  }, []);
  const frame = useCallback((p: number) => {
    const page = root.current;
    if (!page) return;
    page.style.setProperty("--journey-progress", String(p / JOURNEY_LIMIT));
    const next = chapterIndex(p);
    if (activeRef.current !== next) { activeRef.current = next; setActive(next); }
    const openingOpacity = 1 - smooth(0.035, 0.095, p);
    page.querySelectorAll<HTMLElement>("[data-journey-panel]").forEach((panel, i) => {
      const center = journeyChapters[i].at;
      const opacity = i === 0 ? openingOpacity
        : smooth(center - 0.075, center - 0.035, p)
          * (i === projects.length ? 1 - smooth(FINALE_FROM, FINALE_FROM + 0.035, p)
            : 1 - smooth(center + 0.04, center + 0.08, p));
      panel.style.opacity = String(opacity);
      panel.style.transform = `translate3d(0,${(1 - opacity) * 16}px,0)`;
      panel.inert = opacity < 0.12;
      panel.setAttribute("aria-hidden", String(opacity < 0.12));
      panel.style.pointerEvents = opacity > 0.12 ? "auto" : "none";
    });
    const passage = page.querySelector<HTMLElement>(".journey-passage");
    if (passage) passage.style.opacity = String(smooth(0.085, 0.12, p) * (1 - smooth(0.145, 0.18, p)));
  }, []);
  const closeIndex = () => { indexDialog.current?.close(); setIndexOpen(false); menuButton.current?.focus(); };
  const openIndex = () => { indexDialog.current?.showModal(); setIndexOpen(true); };
  const travel = (at: number) => { closeIndex(); seekJourney(at); };
  useEffect(() => {
    if (status !== "fallback") return;
    const read = () => frame(window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * JOURNEY_LIMIT);
    const seek = (event: Event) => window.scrollTo({ top: Math.min(JOURNEY_LIMIT, Number((event as CustomEvent).detail)) / JOURNEY_LIMIT * (document.documentElement.scrollHeight - innerHeight), behavior: "smooth" });
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("journey:seek", seek);
    read();
    return () => { window.removeEventListener("scroll", read); window.removeEventListener("journey:seek", seek); };
  }, [status, frame]);
  const next = journeyChapters[active + 1];
  const nextLabel = active === 1 ? "К FARO" : next?.id === "finale" ? "К букве И" : next ? "Дальше" : "Сначала";
  return (
    <main id="main" ref={root} className={`journey-page is-${status}`} style={{ height: `${JOURNEY_SCROLL_SVH + 100}svh` }}>
      <div className="journey-stage">
        <Suspense fallback={null}><JourneyCanvas onFrame={frame} onStatus={setStatus} paused={indexOpen || status === "fallback"} /></Suspense>
        <div className="journey-vignette" aria-hidden="true" />
        {status === "fallback" && <div className="journey-fallback" aria-hidden="true">
          {next ? <img src={projects[active - 1]?.screen ?? "/assets/images/monolith-fallback.svg"} alt="" /> : <span className="journey-fallback-letter">И</span>}
        </div>}
      </div>
      <header className="journey-header">
        <button className="journey-wordmark" onClick={() => seekJourney(0)} aria-label="LOXNE — к началу путешествия"><Mark /><span>LOXNE</span></button>
        <span className="journey-edition">Дизайн / Движение / Код</span>
        <div className="journey-header-actions">
          <a className="journey-contact-link" href={author.github} target="_blank" rel="noreferrer">Мой GitHub <Arrow /></a>
          <button ref={menuButton} className="journey-index-button" onClick={openIndex} aria-haspopup="dialog" aria-expanded={indexOpen}>Проекты <span className="journey-index-symbol" aria-hidden="true"><i /><i /></span></button>
        </div>
      </header>
      <div className="journey-captions">
        <section className="journey-panel journey-opening" data-journey-panel="intro">
          <p className="journey-caption-label">Портфолио LOXNE</p>
          <ReactiveName />
          <p className="journey-opening-line">Миры под поверхностью.</p>
          <div className="journey-opening-actions">
            <button className="journey-enter" onClick={() => seekJourney(0.24)}>Войти внутрь <span><Arrow direction="down" /></span></button>
            <button className="journey-touch" onClick={() => window.dispatchEvent(new Event("journey:touch"))}>Коснуться поверхности</button>
          </div>
        </section>
        {projects.map((p, i) => <section key={p.id} data-journey-panel={p.id} className={`journey-panel journey-project-caption journey-caption-${p.id}`} style={{ opacity: 0, pointerEvents: "none" }} aria-hidden="true" inert>
          <div className="journey-project-heading">
            <p className="journey-caption-label">{p.number} / 04 <span>{p.kicker}</span></p>
            <h2 id={`world-${p.id}-title`} tabIndex={-1}>{p.title}</h2>
            <p className="journey-project-description">{descriptions[i]}</p>
            {p.id === "timepiece" && <div className="journey-watch-control">
              <label htmlFor="journey-disassembly">Раздвиньте детали</label>
              <input id="journey-disassembly" type="range" min="0" max="100" value={watchSetting} aria-label="Разборка часов" onChange={e => { const value = Number(e.target.value); setWatchSetting(value); window.dispatchEvent(new CustomEvent("journey:watch", { detail: value / 100 })); }} />
              <button onClick={() => { setWatchSetting(52); window.dispatchEvent(new CustomEvent("journey:watch", { detail: null })); }}>Авто</button>
            </div>}
          </div>
          <PortfolioLink className="journey-open-project" to={`/work/${p.id}`}><span>Внутри проекта</span><Arrow /></PortfolioLink>
        </section>)}
      </div>
      <p className="journey-passage" aria-hidden="true">По ту сторону формы</p>
      <div className="journey-position" aria-hidden="true"><span>{String(active).padStart(2, "0")}</span><span>{journeyChapters[active].title}</span></div>
      <footer className="journey-controls">
        <span className="journey-scroll-cue">{status === "loading" ? "Открываем пространство…" : active === 0 ? "Прокрутите, чтобы войти" : active === 1 ? "Механизм в ваших руках" : next ? "Листайте, чтобы пройти дальше" : "Финальный зал"}</span>
        <nav className="journey-rail" aria-label="Остановки путешествия">
          <span className="journey-rail-line" aria-hidden="true"><i /></span>
          {journeyChapters.map((chapter, i) => <button key={chapter.id} className={i === active ? "is-active" : ""} onClick={() => seekJourney(chapter.at)} aria-current={i === active ? "step" : undefined} aria-label={chapter.title} title={chapter.title}><span className="journey-rail-dot" /><span className="journey-rail-number">{String(i).padStart(2, "0")}</span></button>)}
        </nav>
        <button className="journey-next" onClick={() => seekJourney(next?.at ?? 0)}>{nextLabel} <Arrow direction={next ? "right" : "up"} /></button>
      </footer>
      <div className="journey-markers" aria-hidden="true">
        {journeyChapters.filter(c => c.id !== "finale").map((c, i) => <div key={c.id} className="journey-marker" id={i === 0 ? "intro" : `work-${c.id}`} data-chapter={c.id} style={{ top: `${Math.max(0, c.at - 0.04) / JOURNEY_LIMIT * JOURNEY_SCROLL_SVH}svh`, height: `${(i === 0 ? 0.04 : 0.08) / JOURNEY_LIMIT * JOURNEY_SCROLL_SVH + 100}svh` }} />)}
        <span id="works" style={{ top: `${0.24 / JOURNEY_LIMIT * JOURNEY_SCROLL_SVH}svh` }} />
      </div>
      <dialog ref={indexDialog} className="journey-index" aria-labelledby="journey-index-title" onCancel={() => setIndexOpen(false)} onClose={() => setIndexOpen(false)}>
        <div className="journey-index-top"><h2 id="journey-index-title">Четыре мира.</h2><button onClick={closeIndex}>Закрыть <span aria-hidden="true">×</span></button></div>
        <div className="journey-index-list">{projects.map((p, i) => <PortfolioLink key={p.id} className="journey-index-row" to={`/work/${p.id}`} onClick={closeIndex}><span className="journey-index-no">{p.number}</span><img src={p.screen} alt="" width="192" height="108" loading="lazy" /><span className="journey-index-name">{p.title}<small>{p.kicker}</small></span><Arrow /></PortfolioLink>)}</div>
        <div className="journey-index-bottom"><button onClick={() => travel(0.24)}>Внутрь механизма <Arrow /></button><a href={author.github} target="_blank" rel="noreferrer">Мой GitHub <Arrow /></a><PortfolioLink to="/credits" onClick={closeIndex}>Источники</PortfolioLink></div>
      </dialog>
    </main>
  );
}
