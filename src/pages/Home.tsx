import { author, projects } from "../content/portfolio";
import { PortfolioLink } from "../navigation/NavigationProvider";
import { Arrow, Mark } from "../components/Icon";
import { ProjectCover } from "../components/ProjectCover";
import { Showreel } from "../components/Showreel";
export function Home() {
  return (
    <main id="main">
      <section className="hero chapter" data-chapter="intro" id="intro">
        <div className="hero-sticky">
          <div className="hero-copy">
            <p className="eyebrow">Дизайн и разработка сайтов</p>
            <h1 tabIndex={-1}>
              Миры под
              <br />
              <span>поверхностью</span>
            </h1>
            <p className="hero-description">
              Создаю сайты, в которых интерфейс,
              <br className="desktop-break" /> движение и код работают вместе
            </p>
            <PortfolioLink to="/#works" className="primary-action">
              Смотреть работы <Arrow direction="down" />
            </PortfolioLink>
          </div>
          <div className="hero-exhibit">
            <div
              className="scene-anchor hero-object"
              data-world="monolith"
              aria-hidden="true"
            >
              <img
                className="scene-fallback"
                src="/assets/images/monolith-fallback.svg"
                alt=""
                width="800"
                height="880"
                fetchPriority="high"
              />
            </div>
            <span className="object-caption">
              Снаружи — форма
              <br />
              Внутри — четыре мира
            </span>
          </div>
          <div className="hero-bottom">
            <span className="meta">LOXNE / Избранное</span>
            <span className="scroll-hint">
              <span className="scroll-line" />
              <span className="motion-hint">Прокрутите, чтобы войти</span>
              <span className="static-hint">Четыре работы ниже</span>
            </span>
            <PortfolioLink to="/#work-timepiece" className="quiet-link">
              Сразу к работам <Arrow direction="right" />
            </PortfolioLink>
          </div>
          <div className="passage-copy" aria-hidden="true">
            <span className="meta">По ту сторону формы</span>
            <p>
              У каждой детали
              <br />
              есть своя история
            </p>
          </div>
        </div>
      </section>
      <section id="works" className="works-intro">
        <span className="eyebrow">Четыре работы</span>
        <h2>
          Разные миры
          <br />
          <span className="secondary">Один подход к деталям</span>
        </h2>
        <p>
          От устройства механизма
          <br />
          до повседневного интерфейса
        </p>
      </section>
      {projects.map((p) => (
        <section
          id={`work-${p.id}`}
          data-chapter={p.id}
          className={`world-section chapter world-${p.id}`}
          key={p.id}
          aria-labelledby={`world-${p.id}-title`}
        >
          <div className="world-sticky">
            <div className="world-copy">
              <span className="eyebrow">
                <span className="number">{p.number}</span>
                {p.kicker}
              </span>
              <h2 id={`world-${p.id}-title`} tabIndex={-1}>
                <PortfolioLink to={`/work/${p.id}`}>{p.title}</PortfolioLink>
              </h2>
              <p className="world-tagline">{p.tagline}</p>
              <p className="world-description">{p.summary}</p>
              <ul className="facts">
                {p.facts.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <PortfolioLink
                className="case-link"
                to={`/work/${p.id}`}
                onPointerEnter={() =>
                  window.dispatchEvent(
                    new CustomEvent("portfolio:prefetch", { detail: p.id }),
                  )
                }
              >
                Смотреть проект <Arrow direction="right" />
              </PortfolioLink>
            </div>
            <div className="world-visual">
              <ProjectCover project={p} />
              <div className="world-visual-footer">
                <span className="meta">{p.number} / 4</span>
                <span>
                  {p.id === "faro"
                    ? "Демонстрационный сайт пиццерии"
                    : p.id === "wordflow"
                      ? "Приложение для изучения слов"
                      : p.id === "egypt"
                        ? "Интерактивная экспозиция"
                        : "Интерактивная разборка"}
                </span>
                <PortfolioLink
                  to={`/work/${p.id}`}
                  aria-label={`Открыть ${p.title}`}
                >
                  <Arrow />
                </PortfolioLink>
              </div>
            </div>
          </div>
        </section>
      ))}
      <section
        id="about"
        data-chapter="about"
        className="about-section chapter"
      >
        <div className="section-heading">
          <span className="eyebrow">Мой подход</span>
          <h2>
            Продумывать форму
            <br />
            <span className="secondary">Доводить до работы</span>
          </h2>
        </div>
        <div className="about-content">
          <p className="about-lead">
            Мне интересны сайты, которые хочется рассмотреть. За выразительной
            сценой должны оставаться понятный интерфейс, точное движение и
            надёжный код
          </p>
          <div className="process">
            <article>
              <span className="number">01</span>
              <div>
                <h3>Найти идею</h3>
                <p>
                  Разбираюсь в задаче и выбираю образ, который раскрывает сам
                  проект
                </p>
              </div>
            </article>
            <article>
              <span className="number">02</span>
              <div>
                <h3>Проверить в движении</h3>
                <p>Собираю прототип, настраиваю композицию, свет и темп</p>
              </div>
            </article>
            <article>
              <span className="number">03</span>
              <div>
                <h3>Довести в браузере</h3>
                <p>
                  Соединяю интерфейс и сцену, проверяю управление и адаптацию
                </p>
              </div>
            </article>
          </div>
          <Showreel />
        </div>
      </section>
      <section
        id="contact"
        data-chapter="contact"
        className="contact-section chapter"
      >
        <div className="contact-sticky">
          <div className="contact-copy">
            <span className="eyebrow">Следующий мир — ваш</span>
            <h2>
              Придадим
              <br />
              идее форму
            </h2>
            <p>Новые проекты начинаются со знакомства</p>
            <a
              className="primary-action metal-action"
              href={author.github}
              target="_blank"
              rel="noreferrer"
            >
              Мой GitHub <Arrow />
            </a>
          </div>
          <div
            className="scene-anchor finale-object"
            data-world="monolith"
            data-finale="true"
            aria-hidden="true"
          >
            <img
              className="scene-fallback"
              src="/assets/images/monolith-fallback.svg"
              alt=""
              width="800"
              height="880"
              loading="lazy"
            />
          </div>
          <div className="contact-signature">
            <Mark />
            <span>{author.name}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
