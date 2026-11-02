import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import {
  usePortfolioNavigation,
  PortfolioLink,
} from "../navigation/NavigationProvider";
import { Header } from "../components/Header";
import { Home } from "../pages/Home";
import { CasePage } from "../pages/CasePage";
import { Credits } from "../pages/Credits";
import { NotFound } from "../pages/NotFound";
import { author } from "../content/portfolio";
import { Arrow } from "../components/Icon";
const SceneHost = lazy(() => import("./SceneHost"));
export function App() {
  const { display, busy } = usePortfolioNavigation();
  useEffect(() => {
    document.documentElement.dataset.motion = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "reduced"
      : "full";
  }, []);
  return (
    <>
      <Header />
      <div className="page-shell" aria-busy={busy}>
        <Routes location={display}>
          <Route path="/" element={<Home />} />
          <Route path="/work/:id" element={<CasePage />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Suspense fallback={null}>
        <SceneHost />
      </Suspense>
      <footer className="site-footer">
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
      </footer>
    </>
  );
}
