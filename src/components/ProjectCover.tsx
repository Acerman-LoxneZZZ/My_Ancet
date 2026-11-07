import type { Project } from "../content/portfolio";
import type { CSSProperties } from "react";
export function ProjectCover({
  project,
  large = false,
}: {
  project: Project;
  large?: boolean;
}) {
  const p = project;
  return (
    <div
      className={`project-cover cover-${p.id} ${large ? "cover-large" : ""}`}
      style={{ "--project-accent": p.accent } as CSSProperties}
    >
      <div className="cover-floor" />
      <div className="cover-plinth" />
      {p.id === "wordflow" ? (
        <>
          <div className="device device-primary">
            <img
              src={p.screen}
              alt="Wordflow — карточка слова, ответы и прогресс"
              loading="lazy"
              width="390"
              height="844"
            />
          </div>
          <div className="device device-secondary">
            <img
              src={p.detail}
              alt="Wordflow — настоящие словари"
              loading="lazy"
              width="390"
              height="844"
            />
          </div>
        </>
      ) : (
        <div className="project-screen">
          <img
            src={p.screen}
            alt={`Настоящий экран ${p.title}`}
            loading="lazy"
            width={p.id === "proyavleno" ? 896 : 1280}
            height={p.id === "proyavleno" ? 560 : p.id === "dal" || p.id === "tutor" || p.id === "castle" || p.id === "egypt" ? 800 : 720}
          />
        </div>
      )}
      {p.id === "faro" && (
        <div className="menu-screen">
          <img
            src={p.detail}
            alt="Коралловое меню FARO"
            loading="lazy"
            width="1280"
            height="720"
          />
        </div>
      )}
      {p.id === "egypt" && (
        <div className="portal-object">
          <img
            src="/assets/images/egypt-gateway.png"
            alt=""
            loading="lazy"
            width="1788"
            height="880"
          />
        </div>
      )}
      {(p.id === "timepiece" || p.id === "faro") && (
        <div
          className="scene-anchor cover-object"
          data-world={p.id}
          data-scene-label={p.title}
          aria-hidden="true"
        />
      )}
      <span className="cover-caption">
        {p.id === "wordflow"
          ? "Карточки и словари"
          : p.id === "egypt"
            ? "Портал в семь историй"
            : p.id === "proyavleno"
              ? "Первый экран со светящейся лентой"
              : p.id === "dal" || p.id === "tutor" || p.id === "castle"
                ? "Первый экран проекта"
                : "Экран + исходная модель"}
      </span>
    </div>
  );
}
