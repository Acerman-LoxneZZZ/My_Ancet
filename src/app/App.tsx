import { lazy, Suspense, useEffect } from "react";
import { matchPath, Routes, Route } from "react-router-dom";
import {
  usePortfolioNavigation,
  PortfolioLink,
} from "../navigation/NavigationProvider";
import { Header } from "../components/Header";
import { Home } from "../pages/Home";
import { CasePage } from "../pages/CasePage";
import { Credits } from "../pages/Credits";
import { NotFound } from "../pages/NotFound";
import { ShowcasePage } from "../pages/ShowcasePage";
import { author } from "../content/portfolio";
import { Arrow } from "../components/Icon";
const SceneHost = lazy(() => import("./SceneHost"));
export function App() {
  const { display, busy } = usePortfolioNavigation();
  const showChrome = display.pathname !== "/" && !matchPath("/showcase/:id", display.pathname);
  useEffect(() => {
    document.documentElement.dataset.motion = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "reduced"
      : "full";
  }, []);
  return (
    <>
      {showChrome && <Header />}
      <div className="page-shell" aria-busy={busy}>
        <Routes location={display}>
          <Route path="/" element={<Home />} />
          <Route path="/work/:id" element={<CasePage />} />
          <Route path="/showcase/:id" element={<ShowcasePage />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {showChrome && <Suspense fallback={null}>
        <SceneHost />
      </Suspense>}
      {showChrome && <footer className="site-footer">
        <PortfolioLink to="/" className="footer-name">
          {author.name}
        </PortfolioLink>
        <span>Дизайн · Движение · Код</span>
        <PortfolioLink to="/credits">Источники</PortfolioLink>
        <PortfolioLink
          to={`${display.pathname}${display.search}#main`}
          aria-label="Вернуться наверх"
        >
          Наверх <Arrow direction="up" />
        </PortfolioLink>
      </footer>}
    </>
  );
}
