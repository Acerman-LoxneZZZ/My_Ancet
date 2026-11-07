import { publicUrl } from "../lib/publicUrl";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getProject, nextProject, projectCount, type Project } from "../content/portfolio";
import { galleryProjectId } from "../experience/journey/chapters";
import { PortfolioLink } from "../navigation/NavigationProvider";
import { ProjectCover } from "../components/ProjectCover";
import { MediaViewer } from "../components/MediaViewer";
import { Arrow } from "../components/Icon";
import { NotFound } from "./NotFound";

type WatchPart = {
  id: string;
  title: string;
  description: string;
  materialLabel?: string;
};

function readWatchParts(value: unknown): WatchPart[] {
  if (!Array.isArray(value) || value.length !== 47)
    throw new Error("Invalid watch part list");
  const valid = value.every(
    (part) =>
      part &&
      typeof part === "object" &&
      typeof part.id === "string" &&
      typeof part.title === "string" &&
      typeof part.description === "string" &&
      (part.materialLabel === undefined ||
        typeof part.materialLabel === "string"),
  );
  if (!valid || new Set(value.map((part) => part.id)).size !== 47)
    throw new Error("Invalid watch part data");
  return value as WatchPart[];
}

function TimepieceInspector() {
  const anchor = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState("");
  const [parts, setParts] = useState<WatchPart[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(publicUrl("/assets/data/watch-parts.json"), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Watch data unavailable");
        return response.json();
      })
      .then((value) => {
        if (!controller.signal.aborted) setParts(readWatchParts(value));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const element = anchor.current;
    if (!element) return;
    const update = () => setReady(element.dataset.worldReady === "true");
    const observer = new MutationObserver(update);
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-world-ready"],
    });
    update();
    return () => observer.disconnect();
  }, []);

  const part = parts.find((item) => item.id === selected);
  return (
    <section className="case-inspector" aria-labelledby="inspector-title">
      <div className="section-heading">
        <p className="eyebrow">Осмотр механизма</p>
        <h2 id="inspector-title">Разобрать и рассмотреть</h2>
        <p>
          Исходная модель из 47 деталей. Это демонстрация устройства, без
          симуляции хода часов.
        </p>
      </div>
      <div className="inspector-layout">
        <div
          ref={anchor}
          className="scene-anchor inspector-scene"
          data-world="timepiece"
          data-progress={progress / 100}
          data-selected={selected || undefined}
          data-scene-label="Осмотр карманных часов"
          role="img"
          aria-label="Карманные часы. Разборкой и выбором детали можно управлять с помощью элементов рядом"
        >
          <img
            className="scene-fallback inspector-fallback"
            hidden={ready}
            src={publicUrl("/assets/images/timepiece-exploded.jpg")}
            alt="Сохранённый снимок разборки часов в исходном приложении"
            width="1265"
            height="712"
            loading="lazy"
          />
        </div>
        <div className="inspector-controls">
          {!ready && (
            <p className="inspector-note">
              Пока 3D недоступно, показан сохранённый снимок. Описания деталей
              можно читать отдельно.
            </p>
          )}
          <div className="inspector-progress-label">
            <label htmlFor="watch-disassembly">Разборка</label>
            <output htmlFor="watch-disassembly">{progress}%</output>
          </div>
          <input
            id="watch-disassembly"
            className="inspector-range"
            type="range"
            min="0"
            max="100"
            step="1"
            value={progress}
            disabled={!ready}
            aria-valuetext={`${progress} процентов`}
            onChange={(event) => setProgress(Number(event.target.value))}
          />
          <button
            className="secondary-action"
            type="button"
            disabled={!ready || progress === 0}
            onClick={() => setProgress(0)}
          >
            Собрать
          </button>
          <div className="inspector-part-field">
            <label htmlFor="watch-part">Деталь</label>
            <select
              id="watch-part"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={parts.length === 0}
              aria-describedby="watch-part-description"
            >
              <option value="">Все детали</option>
              {parts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <div
              className="inspector-error"
              id="watch-part-description"
              role="alert"
            >
              <p>Не удалось загрузить список деталей</p>
              <button
                className="quiet-link"
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Попробовать снова
              </button>
            </div>
          ) : (
            <div
              className="inspector-part-description"
              id="watch-part-description"
              aria-live="polite"
            >
              {part ? (
                <>
                  <h3>{part.title}</h3>
                  <p>{part.description}</p>
                  {part.materialLabel && (
                    <span className="meta">{part.materialLabel}</span>
                  )}
                </>
              ) : (
                <p>
                  {parts.length
                    ? "Выберите деталь, чтобы прочитать её описание и выделить в сцене."
                    : "Загружается список деталей…"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function WordflowDemo() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const reset = () =>
    frame.current?.contentWindow?.postMessage(
      { type: "loxne-wordflow-reset" },
      window.location.origin,
    );
  return (
    <section
      className="wordflow-demo-section"
      aria-labelledby="wordflow-demo-title"
    >
      <div className="wordflow-demo-copy">
        <p className="eyebrow">Попробовать приложение</p>
        <h2 id="wordflow-demo-title">Шесть слов для знакомства</h2>
        <p>
          Здесь работает оригинальный интерфейс Wordflow: переворот карточки,
          три варианта ответа и словари. Для демонстрации подготовлены шесть
          учебных слов.
        </p>
        <p>
          Данные демо отделены от личных профилей. Telegram-вход и облачная
          синхронизация в этом окне не подключены.
        </p>
        <button
          type="button"
          className="secondary-action"
          onClick={reset}
          disabled={!loaded}
        >
          Начать заново
        </button>
        <a
          className="quiet-link"
          href="https://t.me/WordsENRUbot"
          target="_blank"
          rel="noopener noreferrer"
        >
          Личное приложение в Telegram <Arrow />
        </a>
      </div>
      <div className="wordflow-demo-frame">
        <iframe
          ref={frame}
          className="wordflow-iframe"
          src={publicUrl("/demos/wordflow/index.html")}
          title="Wordflow — демонстрация на шести учебных словах"
          width="390"
          height="844"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </section>
  );
}

const sourceAlt: Record<Project["id"], [string, string]> = {
  castle: ["Первый экран Castle с каменными башнями", "Галерея замков Европы в исходном сайте"],
  timepiece: [
    "Первый экран KARpOV с крупным планом карманных часов",
    "Часы в разобранном состоянии в исходном приложении",
  ],
  faro: [
    "Первый экран FARO с исходной 3D-пиццей",
    "Коралловое меню FARO с блюдами и выбором позиций",
  ],
  egypt: [
    "Исходный каменный портал и панорама экспозиции «Египет»",
    "Глава египетской экспозиции с текстом и изображением",
  ],
  proyavleno: [
    "Первый экран «ПРОЯВЛЕНО» со светящейся лентой",
    "Галерея концептов сайтов для частной практики",
  ],
  dal: ["Первый экран сайта ДАЛЬ с горным озером", "Вращающаяся галерея направлений"],
  tutor: ["Первый экран сайта репетитора с авторским портретом", "Страница разбора квадратного уравнения"],
  wordflow: [
    "Оригинальный интерфейс Wordflow: карточка и ответы на учебных данных",
    "Оригинальный интерфейс словарей Wordflow на учебных данных",
  ],
};

export function CasePage() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id);
  useEffect(() => {
    if (project) document.title = `${project.title} — LOXNE`;
  }, [project?.title]);
  if (!project) return <NotFound />;
  const next = nextProject(project.id);
  const dimensions =
    project.id === "wordflow"
      ? { width: 390, height: 844 }
      : project.id === "timepiece"
        ? { width: 1265, height: 712 }
        : project.id === "faro"
          ? { width: 1270, height: 714 }
          : project.id === "proyavleno"
            ? { width: 896, height: 560 }
            : project.id === "egypt"
              ? { width: 1280, height: 800 }
              : { width: 1280, height: 800 };
  const detailDimensions = project.id === "proyavleno"
    ? { width: 1280, height: 800 }
    : project.id === "egypt" ? { width: 1272, height: 716 } : dimensions;

  return (
    <main id="main" className={`case-page case-${project.id}`}>
      <div className="case-topline">
        <PortfolioLink to="/" project={galleryProjectId(project.id)} className="quiet-link">
          <Arrow direction="left" /> Вернуться в галерею
        </PortfolioLink>
        <span className="meta">{project.number} / {projectCount}</span>
      </div>
      <header className="case-heading">
        <p className="eyebrow">{project.kicker}</p>
        <h1 tabIndex={-1}>{project.title}</h1>
        <p className="case-tagline">{project.tagline}</p>
        <p className="case-summary">{project.summary}</p>
      </header>
      <div className="case-cover">
        <ProjectCover project={project} large />
      </div>
      <section className="case-overview" aria-label="О проекте">
        <div className="case-overview-item">
          <h2>Задача</h2>
          <p>{project.challenge}</p>
        </div>
        <div className="case-overview-item">
          <h2>Моя работа</h2>
          <p>{project.role}</p>
        </div>
        <div className="case-overview-item">
          <h2>Статус</h2>
          <p>{project.status}</p>
        </div>
      </section>
      <section className="case-story" aria-labelledby="case-story-title">
        <div className="case-story-heading">
          <p className="eyebrow">Как это устроено</p>
          <h2 id="case-story-title">{project.tagline}</h2>
          <p>{project.description}</p>
        </div>
        <div className="case-decisions">
          {project.decisions.map((decision, index) => (
            <article className="case-decision" key={decision.title}>
              <span className="number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{decision.title}</h3>
                <p>{decision.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      {project.id === "timepiece" && <TimepieceInspector />}
      {project.id === "wordflow" && <WordflowDemo />}
      <section
        className={`case-screens ${project.id === "wordflow" ? "case-screens-mobile" : ""}`}
        aria-labelledby="case-screens-title"
      >
        <div className="section-heading">
          <p className="eyebrow">Экраны проекта</p>
          <h2 id="case-screens-title">Оригинальный интерфейс</h2>
          <p>
            Снимки с работающей локальной версии
            {project.id === "wordflow" ? " на учебных данных" : ""}. Нажмите,
            чтобы рассмотреть крупнее.
          </p>
        </div>
        <div className="case-screen-grid">
          <figure className="case-screen">
            <MediaViewer src={project.screen} alt={sourceAlt[project.id][0]}>
              <img
                src={project.screen}
                alt={sourceAlt[project.id][0]}
                {...dimensions}
                loading="lazy"
              />
            </MediaViewer>
            <figcaption>Основной экран</figcaption>
          </figure>
          <figure className="case-screen">
            <MediaViewer src={project.detail} alt={sourceAlt[project.id][1]}>
              <img
                src={project.detail}
                alt={sourceAlt[project.id][1]}
                {...detailDimensions}
                loading="lazy"
              />
            </MediaViewer>
            <figcaption>{project.detailLabel}</figcaption>
          </figure>
        </div>
      </section>
      <section
        className="case-presentation"
        aria-labelledby="case-presentation-title"
      >
        <h2 id="case-presentation-title">Подача в портфолио</h2>
        <p>{project.presentation}</p>
        <PortfolioLink to="/credits" className="quiet-link">
          Источники и авторы материалов <Arrow direction="right" />
        </PortfolioLink>
      </section>
      <div className="case-source-actions">
        <a
          className="secondary-action"
          href={project.repository}
          target="_blank"
          rel="noopener noreferrer"
        >
          Исходный код <Arrow />
        </a>
        {project.demo && (
          <a
            className="primary-action"
            href={project.demo.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {project.demo.label} <Arrow />
          </a>
        )}
      </div>
      <section className="next-case" aria-label="Следующий проект">
        <span className="eyebrow">Следующий проект</span>
        <PortfolioLink to={`/work/${next.id}`} className="next-case-link">
          <h2>{next.title}</h2>
          <Arrow direction="right" />
        </PortfolioLink>
        <p>{next.summary}</p>
      </section>
    </main>
  );
}
