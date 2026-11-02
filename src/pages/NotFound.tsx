import { useEffect } from "react";
import { PortfolioLink } from "../navigation/NavigationProvider";
import { Arrow } from "../components/Icon";

export function NotFound() {
  useEffect(() => {
    document.title = "Страница не найдена — LOXNE";
  }, []);
  return (
    <main id="main" className="not-found">
      <p className="eyebrow">404</p>
      <h1 tabIndex={-1}>Такой страницы нет</h1>
      <p>Работы и контакт доступны на главной странице</p>
      <PortfolioLink to="/" className="primary-action">
        К портфолио <Arrow direction="right" />
      </PortfolioLink>
    </main>
  );
}
