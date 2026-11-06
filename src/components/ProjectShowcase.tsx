import { useLayoutEffect, useRef, useState } from "react";
import type { Project } from "../content/portfolio";
import { Arrow } from "./Icon";

export function ProjectShowcase({ project, onClose }: { project: Project; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);
  const demo = project.showcase;

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element || element.open) return;
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
  }, []);

  return (
    <dialog
      ref={dialog}
      className="journey-showcase"
      aria-labelledby="journey-showcase-title"
      onClose={onClose}
    >
      <div className="journey-showcase-copy">
        <p className="journey-caption-label">{project.number} / 04</p>
        <h2 id="journey-showcase-title">{project.title}</h2>
        <a
          className="journey-open-project"
          href={project.demo?.url ?? demo.src}
          target="_blank"
          rel="noopener noreferrer"
        >
          {project.demo?.label ?? "Открыть отдельно"} <Arrow />
        </a>
      </div>
      <div className="journey-showcase-display">
        <div className="journey-showcase-bar">
          <span>Живая витрина</span>
          <button type="button" ref={closeButton} onClick={() => dialog.current?.close()}>
            Закрыть <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="journey-showcase-screen" data-portrait={project.id === "wordflow"}>
          {!loaded && <img src={project.screen} alt="" />}
          <iframe
            src={demo.src}
            title={`${project.title} — интерактивная витрина`}
            aria-describedby="journey-showcase-instruction"
            sandbox={project.id === "timepiece"
              ? "allow-scripts allow-same-origin allow-popups allow-downloads"
              : "allow-scripts allow-same-origin allow-popups"}
            referrerPolicy="no-referrer"
            data-loaded={loaded}
            onLoad={() => setLoaded(true)}
          />
        </div>
        <p id="journey-showcase-instruction">{demo.instruction}</p>
      </div>
    </dialog>
  );
}
