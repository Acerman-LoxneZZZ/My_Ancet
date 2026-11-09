import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { getProject } from "../content/portfolio";
import { NotFound } from "./NotFound";

export function ShowcasePage() {
  const project = getProject(useParams().id);
  const src = project?.showcase.src;

  useEffect(() => {
    if (src) window.location.replace(src);
  }, [src]);

  if (!project) return <NotFound />;
  return <main id="main"><a href={project.showcase.src}>Открыть {project.title}</a></main>;
}
