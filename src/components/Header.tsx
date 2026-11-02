import { useEffect, useRef, useState } from "react";
import {
  PortfolioLink,
  usePortfolioNavigation,
} from "../navigation/NavigationProvider";
import { author, projects } from "../content/portfolio";
import { Arrow, Mark } from "./Icon";
export function Header() {
  const [open, setOpen] = useState(false);
  const { display } = usePortfolioNavigation();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [display.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <PortfolioLink
        className="skip-link"
        to={`${display.pathname}${display.search}#main`}
      >
        К содержанию
      </PortfolioLink>
      <header className="site-header">
        <PortfolioLink
          to="/"
          className="wordmark"
          aria-label="LOXNE — на главную"
        >
          <Mark />
          <span>{author.name}</span>
        </PortfolioLink>
        <nav className="desktop-nav" aria-label="Основная навигация">
          <PortfolioLink to="/#works">
            Работы <span className="meta">4</span>
          </PortfolioLink>
          <PortfolioLink to="/#about">Подход</PortfolioLink>
          <PortfolioLink to="/#contact">Контакт</PortfolioLink>
        </nav>
        <a
          className="header-github"
          href={author.github}
          target="_blank"
          rel="noreferrer"
        >
          GitHub <Arrow />
        </a>
        <button
          className="menu-toggle"
          ref={toggle}
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? "Закрыть" : "Меню"}
          <span
            className={open ? "menu-lines open" : "menu-lines"}
            aria-hidden="true"
          />
        </button>
      </header>
      <nav
        className={`mobile-menu ${open ? "is-open" : ""}`}
        id="mobile-menu"
        inert={!open}
        aria-label="Мобильная навигация"
      >
        <div className="mobile-menu-inner">
          <span className="meta">Четыре работы</span>
          {projects.map((p) => (
            <PortfolioLink key={p.id} to={`/work/${p.id}`}>
              <span className="meta">{p.number}</span>
              {p.title}
              <Arrow />
            </PortfolioLink>
          ))}
          <div className="menu-bottom">
            <PortfolioLink to="/#about" onClick={() => setOpen(false)}>
              Подход
            </PortfolioLink>
            <PortfolioLink to="/#contact" onClick={() => setOpen(false)}>
              Контакт
            </PortfolioLink>
          </div>
        </div>
      </nav>
    </>
  );
}
