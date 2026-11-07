import { publicUrl } from "../lib/publicUrl";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { LoadingScreen } from "../components/LoadingScreen";
import { author, projectCount, projects, type Project } from "../content/portfolio";
import { PortfolioLink } from "../navigation/NavigationProvider";
import { Arrow, Mark } from "../components/Icon";
import { ReactiveName } from "../components/ReactiveName";
import { ProjectShowcase } from "../components/ProjectShowcase";
import { clampJourneyProgress, FINALE_FROM, JOURNEY_LIMIT, JOURNEY_SCROLL_SVH, journeyChapters, chapterIndex, exhibitProgress, galleryShutterStart, seekJourney } from "../experience/journey/chapters";
import { openingCaptionEnd, shadowHold } from "../experience/journey/entrance";

const JourneyCanvas = lazy(() => import("../components/JourneyCanvas"));
const surname = "Карпов";
const firstExhibit = exhibitProgress("timepiece");
const finaleChapter = journeyChapters[journeyChapters.length - 1];
const smooth = (a: number, b: number, n: number) => {
  const t = Math.min(1, Math.max(0, (n - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const descriptions = ["Карманные часы с эмалевым циферблатом.", "Тесто, огонь и немного Италии.", "По ту сторону древнего портала.", "Светящаяся лента и четыре концепта сайтов.", "Пять направлений и история в фотографиях.", "Объёмный портрет и пошаговый разбор задач.", "Каменные башни и истории замков Европы."];

function ShowcaseChevron() {
  return (
    <svg width="20" height="28" viewBox="0 0 20 28" aria-hidden="true">
      <path d="M4 4h.01M10 9h.01M16 14h.01M10 19h.01M4 24h.01" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}

export function Home() {
  const root = useRef<HTMLElement>(null);
  const indexDialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pendingTravel = useRef<number | null>(null);
  const activeRef = useRef(0);
  const presentation = useRef<{
    page: HTMLElement;
    rail: HTMLElement | null;
    panels: { element: HTMLElement; opacity: number; hidden?: boolean; interactive?: boolean }[];
  } | null>(null);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [loadProgress, setLoadProgress] = useState(0);
  const loadingProgress = useCallback((value: number) => setLoadProgress(previous => Math.max(previous, value)), []);
  const [indexOpen, setIndexOpen] = useState(false);
  const [showcase, setShowcase] = useState<Project | null>(null);
  useEffect(() => {
    document.documentElement.classList.add("in-journey");
    return () => document.documentElement.classList.remove("in-journey");
  }, []);
  const frame = useCallback((p: number) => {
    const page = root.current;
    if (!page) return;
    if (presentation.current?.page !== page) {
      presentation.current = {
        page,
        rail: page.querySelector<HTMLElement>(".journey-rail-line i"),
        panels: [...page.querySelectorAll<HTMLElement>("[data-journey-panel]")]
          .map(element => ({ element, opacity: NaN })),
      };
    }
    const view = presentation.current;
    // This property only drives the rail. Keeping it here avoids invalidating
    // inherited styles across every panel and letter on every scroll frame.
    view.rail?.style.setProperty("--journey-progress", String(p / JOURNEY_LIMIT));
    const next = chapterIndex(p);
    if (activeRef.current !== next) { activeRef.current = next; setActive(next); }
    const openingOpacity = 1 - smooth(shadowHold.to, openingCaptionEnd, p);
    view.panels.forEach((state, i) => {
      const panel = state.element;
      const chapter = journeyChapters[i];
      const center = chapter.at;
      const reveal = i > 1
        ? smooth(galleryShutterStart(chapter) + 0.008, center - 0.007, p)
        : smooth(center - 0.05, center - 0.024, p);
      const opacity = chapter.id === "intro" ? openingOpacity
        : chapter.id === "finale" ? smooth(FINALE_FROM + 0.062, JOURNEY_LIMIT - 0.015, p)
        : reveal
          * (i === projects.length ? 1 - smooth(FINALE_FROM, FINALE_FROM + 0.025, p)
            : 1 - smooth(center + 0.026, center + 0.054, p));
      if (state.opacity !== opacity) {
        panel.style.opacity = String(opacity);
        panel.style.transform = `translate3d(0,${(1 - opacity) * 16}px,0)`;
        state.opacity = opacity;
      }
      const hidden = opacity < 0.12;
      if (state.hidden !== hidden) {
        panel.inert = hidden;
        panel.setAttribute("aria-hidden", String(hidden));
        state.hidden = hidden;
      }
      const interactive = opacity > 0.12;
      if (state.interactive !== interactive) {
        panel.style.pointerEvents = interactive ? "auto" : "none";
        state.interactive = interactive;
      }
    });
  }, []);
  const closeIndex = () => { indexDialog.current?.close(); setIndexOpen(false); menuButton.current?.focus(); };
  const openIndex = () => { indexDialog.current?.showModal(); setIndexOpen(true); };
  const go = (at: number) => {
    if (status === "loading") pendingTravel.current = at;
    else seekJourney(at);
  };
  const travel = (at: number) => { closeIndex(); go(at); };
  useEffect(() => {
    if (status !== "fallback") return;
    const read = () => frame(window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * JOURNEY_LIMIT);
    const seek = (event: Event) => window.scrollTo({ top: clampJourneyProgress(Number((event as CustomEvent).detail)) / JOURNEY_LIMIT * (document.documentElement.scrollHeight - innerHeight), behavior: "smooth" });
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("journey:seek", seek);
    read();
    return () => { window.removeEventListener("scroll", read); window.removeEventListener("journey:seek", seek); };
  }, [status, frame]);
  useEffect(() => {
    if (status === "loading" || pendingTravel.current === null) return;
    const at = pendingTravel.current;
    pendingTravel.current = null;
    seekJourney(at);
  }, [status]);
  const next = journeyChapters[active + 1];
  const nextLabel = active === 1 ? "К FARO" : next?.id === "finale" ? "В финал" : next ? "Дальше" : "Сначала";
  return (
    <>
    <LoadingScreen progress={status === 'loading' ? loadProgress : 100} complete={status !== 'loading'} />
    <main id="main" ref={root} inert={status === 'loading'} className={`journey-page is-${status}`} style={{ height: `${JOURNEY_SCROLL_SVH + 100}svh` }}>
      <div className="journey-stage">
        <Suspense fallback={null}><JourneyCanvas onFrame={frame} onStatus={setStatus} onLoadProgress={loadingProgress} paused={indexOpen || !!showcase || status === "fallback"} /></Suspense>
        <div className="journey-vignette" aria-hidden="true" />
        {status === "fallback" && <div className="journey-fallback" aria-hidden="true">
          {next ? <img src={projects[active - 1]?.screen ?? publicUrl("/assets/images/monolith-fallback.svg")} alt="" /> : <span className="journey-fallback-letter">И</span>}
        </div>}
      </div>
      <header className="journey-header">
        <button className="journey-wordmark" onClick={() => go(0)} aria-label={`${surname} — к началу путешествия`}><Mark /><span>{surname}</span></button>
        <span className="journey-edition">Дизайн / Движение / Код</span>
        <div className="journey-header-actions">
          <a className="journey-contact-link" href={author.github} target="_blank" rel="noreferrer">Мой GitHub <Arrow /></a>
          <button ref={menuButton} className="journey-index-button" onClick={openIndex} aria-haspopup="dialog" aria-expanded={indexOpen}>Проекты <span className="journey-index-symbol" aria-hidden="true"><i /><i /></span></button>
        </div>
      </header>
      <div className="journey-captions">
        <section className="journey-panel journey-opening" data-journey-panel="intro">
          <p className="journey-caption-label">Портфолио</p>
          <ReactiveName name={surname} />
          <p className="journey-opening-line">Миры под поверхностью.</p>
          <div className="journey-opening-actions">
            <button className="journey-enter" onClick={() => go(firstExhibit)}>Войти внутрь <span><Arrow direction="down" /></span></button>
            <button className="journey-touch" onClick={() => window.dispatchEvent(new Event("journey:touch"))}>Коснуться поверхности</button>
          </div>
        </section>
        {projects.map((p, i) => <section key={p.id} data-journey-panel={p.id} className={`journey-panel journey-project-caption journey-caption-${p.id}`} style={{ opacity: 0, pointerEvents: "none" }} aria-hidden="true" inert>
          <div className="journey-project-heading">
            <p className="journey-caption-label">{p.number} / {projectCount} <span>{p.kicker}</span></p>
            <h2 id={`world-${p.id}-title`} tabIndex={-1}>{p.title}</h2>
            <p className="journey-project-description">{descriptions[i]}</p>
          </div>
          <button
            type="button"
            className="journey-showcase-trigger"
            style={{ '--showcase-color': p.accent, '--showcase-ink': p.id === 'castle' || p.id === 'tutor' ? '#fdf1e1' : '#171d20' } as CSSProperties}
            aria-haspopup="dialog"
            onClick={event => {
              event.currentTarget.focus({ preventScroll: true });
              setShowcase(p);
            }}
          >
            <span className="journey-showcase-label">Попробовать</span>
            <span className="journey-showcase-tile" aria-hidden="true">
              <span className="journey-showcase-arrow"><ShowcaseChevron /></span>
              <span className="journey-showcase-trail">
                {[1, 0.78, 0.54, 0.32, 0.18].map(opacity => (
                  <span key={opacity} style={{ opacity }}><ShowcaseChevron /></span>
                ))}
              </span>
            </span>
          </button>
        </section>)}
        <section className="journey-panel journey-finale" data-journey-panel="finale" style={{ opacity: 0, pointerEvents: "none" }} aria-hidden="true" inert>
          <ReactiveName name={finaleChapter.title} as="h2" />
        </section>
      </div>
      <div className="journey-position" aria-hidden="true"><span>{String(active).padStart(2, "0")}</span><span>{journeyChapters[active].title}</span></div>
      <footer className="journey-controls">
        <span className="journey-scroll-cue">{status === "loading" ? "Открываем пространство…" : active === 0 ? "Прокрутите, чтобы войти" : next ? "Листайте, чтобы пройти дальше" : "Финальный зал"}</span>
        <nav className="journey-rail" aria-label="Остановки путешествия">
          <span className="journey-rail-line" aria-hidden="true"><i /></span>
          {journeyChapters.map((chapter, i) => <button key={chapter.id} className={i === active ? "is-active" : ""} onClick={() => go(chapter.at)} aria-current={i === active ? "step" : undefined} aria-label={chapter.title} title={chapter.title}><span className="journey-rail-dot" /><span className="journey-rail-number">{String(i).padStart(2, "0")}</span></button>)}
        </nav>
        <button className="journey-next" onClick={() => go(next?.at ?? 0)}>{nextLabel} <Arrow direction={next ? "right" : "up"} /></button>
      </footer>
      <div className="journey-markers" aria-hidden="true">
        {journeyChapters.filter(c => c.id !== "finale").map((c, i) => <div key={c.id} className="journey-marker" id={i === 0 ? "intro" : `work-${c.id}`} data-chapter={c.id} style={{ top: `${Math.max(0, c.at - 0.04) / JOURNEY_LIMIT * JOURNEY_SCROLL_SVH}svh`, height: `${(i === 0 ? 0.04 : 0.08) / JOURNEY_LIMIT * JOURNEY_SCROLL_SVH + 100}svh` }}>
          {c.id === "proyavleno" && <span id="work-wordflow" style={{ position: "absolute", top: 0 }} />}
        </div>)}
        <span id="works" style={{ top: `${firstExhibit / JOURNEY_LIMIT * JOURNEY_SCROLL_SVH}svh` }} />
      </div>
      <dialog ref={indexDialog} className="journey-index" aria-labelledby="journey-index-title" onCancel={() => setIndexOpen(false)} onClose={() => setIndexOpen(false)}>
        <div className="journey-index-top"><h2 id="journey-index-title">Залы галереи</h2><button onClick={closeIndex}>Закрыть <span aria-hidden="true">×</span></button></div>
        <div className="journey-index-list">{projects.map((p, i) => <PortfolioLink key={p.id} className="journey-index-row" to={`/work/${p.id}`} onClick={closeIndex}><span className="journey-index-no">{p.number}</span><img src={p.screen} alt="" width="192" height="108" loading="lazy" /><span className="journey-index-name">{p.title}<small>{p.kicker}</small></span><Arrow /></PortfolioLink>)}</div>
        <div className="journey-index-bottom"><button onClick={() => travel(firstExhibit)}>Внутрь механизма <Arrow /></button><a href={author.github} target="_blank" rel="noreferrer">Мой GitHub <Arrow /></a><PortfolioLink to="/credits" onClick={closeIndex}>Источники</PortfolioLink></div>
      </dialog>
      {showcase && <ProjectShowcase project={showcase} onClose={() => setShowcase(null)} />}
    </main>
    </>
  );
}
