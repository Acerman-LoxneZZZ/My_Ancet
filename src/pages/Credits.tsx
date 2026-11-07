import { useEffect, type ReactNode } from "react";
import { projects } from "../content/portfolio";
import { PortfolioLink } from "../navigation/NavigationProvider";
import { Arrow } from "../components/Icon";

function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function Credits() {
  useEffect(() => {
    document.title = "Источники — LOXNE";
  }, []);
  return (
    <main id="main" className="credits-page">
      <div className="case-topline">
        <PortfolioLink to="/" className="quiet-link">
          <Arrow direction="left" /> К портфолио
        </PortfolioLink>
      </div>
      <header className="credits-heading">
        <p className="eyebrow">Происхождение материалов</p>
        <h1 tabIndex={-1}>Источники и авторы</h1>
        <p>
          Портфолио объединяет авторские проекты, их исходные ресурсы и новую
          постановку света, камеры и переходов.
        </p>
      </header>
      <div className="credits-sections">
        <section className="credits-section" aria-labelledby="credits-pizza">
          <h2 id="credits-pizza">Пицца FARO</h2>
          <p>
            Модель{" "}
            <External href="https://sketchfab.com/3d-models/pizza-40d50989fec1460f8838b608d999ccd0">
              Pizza
            </External>{" "}
            создана{" "}
            <External href="https://sketchfab.com/rigsters">Rigsters</External>{" "}
            и используется по лицензии{" "}
            <External href="https://creativecommons.org/licenses/by/4.0/">
              Creative Commons Attribution 4.0
            </External>
            . В исходный проект она получена через зеркало AllenAI Objaverse.
          </p>
          <p>
            В исходном FARO удалена доска, геометрия центрирована и
            нормализована в Blender. Diffuse-текстура восстановлена с помощью
            Real-ESRGAN и смешана с увеличенной методом Lanczos исходной картой
            в доле 40%. Версия для браузера использует Meshopt и WebP; свет и
            движение камеры поставлены отдельно.
          </p>
          <p>
            Исходная карта — 1024×1024. Её производная 4096×4096 является
            увеличением, а не новым сканом. В портфолио сохранена подготовленная
            модель; новые ракурс, свет и окружение относятся к её презентации.
          </p>
          <p>
            Атрибуция распространяется также на рендеры модели. Полное исходное
            уведомление:{" "}
            <a
              href="/assets/licenses/FARO-ATTRIBUTION.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              FARO — авторы и изменения материалов
            </a>
            .
          </p>
        </section>
        <section className="credits-section" aria-labelledby="credits-watch">
          <h2 id="credits-watch">Карманные часы</h2>
          <p>
            Геометрия часов создана процедурно для проекта «Ход времени». В
            портфолио используются исходная GLB-модель и данные 47 деталей;
            новые свет и композиция не меняют происхождение модели.
          </p>
          <p>
            Надписи модели используют DejaVu. Сохранено{" "}
            <a
              href="/assets/licenses/DejaVu.txt"
              target="_blank"
              rel="noopener noreferrer"
            >
              оригинальное лицензионное уведомление
            </a>
            . Это демонстрационная конструкция, без утверждения исторической
            точности или симуляции работающего механизма.
          </p>
        </section>
        <section className="credits-section" aria-labelledby="credits-egypt">
          <h2 id="credits-egypt">Портал и экспозиция Египта</h2>
          <p>
            Резной портал и панорама сохранены из исходного проекта. Эти
            изображения созданы с помощью ИИ как художественные реконструкции.
            Они не являются фотографией конкретного храмового комплекса или
            точной моделью расположения памятников.
          </p>
          <p>
            Музейные изображения в оригинальной экспозиции сопровождаются
            ссылками и атрибуцией The Metropolitan Museum of Art, Open Access /
            Public Domain. Перечень предметов и исторических источников
            находится в{" "}
            <External href="https://github.com/Acerman-LoxneZZZ/egi/blob/1a4725dc9285a8d45ffead5f4342a3e3d94df92d/public/assets/sources.json">
              источниках проекта
            </External>
            .
          </p>
        </section>
        <section className="credits-section" aria-labelledby="credits-castle">
          <h2 id="credits-castle">Castle — Камень и время</h2>
          <p>В витрине работает исходный сайт из <External href="https://github.com/Acerman-LoxneZZZ/castle/tree/fb79bf9ee0a3d002d13a52a6c61724fa0b450077">репозитория автора</External>. Фотографии сопровождаются исходными ссылками и лицензиями в галереях; полный <a href="/demos/castle/assets/sources.json">перечень источников</a> сохранён. Изображения подготовлены в WebP для загрузки в браузере.</p>
          <p>Каменные ворота и латунный анкх в залах портфолио построены из объёмной геометрии для этой галереи.</p>
        </section>
        <section className="credits-section" aria-labelledby="credits-fonts">
          <h2 id="credits-fonts">Шрифты и программные библиотеки</h2>
          <p>
            Локальные Manrope и Cormorant Garamond распространяются с исходными
            уведомлениями SIL Open Font License 1.1:{" "}
            <a
              href="/assets/fonts/Manrope-LICENSE.txt"
              target="_blank"
              rel="noopener noreferrer"
            >
              Manrope
            </a>{" "}
            и{" "}
            <a
              href="/assets/fonts/Cormorant-LICENSE.txt"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cormorant Garamond
            </a>
            .
          </p>
          <p>
            В оригинальном Wordflow сохранены встроенные Manrope и DM Serif
            Display с OFL-уведомлениями, а также IPA-данные dohliam / ipa-dict с
            MIT-уведомлением. Они находятся в{" "}
            <External href="https://github.com/Acerman-LoxneZZZ/EnCard/blob/43a41053321f6c96d7880c14bf353dd384380ced/index.html">
              исходном HTML приложения
            </External>{" "}
            и встроенной демонстрации. Шрифты Literata и Golos Text в исходном
            FARO описаны в его уведомлении о материалах.
          </p>
          <p>
            Для браузерной 3D-сцены сохранены лицензии{" "}
            <a
              href="/assets/licenses/Three-MIT.txt"
              target="_blank"
              rel="noopener noreferrer"
            >
              Three.js
            </a>{" "}
            и{" "}
            <a
              href="/assets/licenses/Meshoptimizer-MIT.txt"
              target="_blank"
              rel="noopener noreferrer"
            >
              Meshoptimizer
            </a>
            . Условия GSAP опубликованы на{" "}
            <External href="https://gsap.com/community/standard-license/">
              сайте библиотеки
            </External>
            .
          </p>
        </section>
        <section className="credits-section" aria-labelledby="credits-screens">
          <h2 id="credits-screens">Экраны и новая постановка</h2>
          <p>
            Экраны четырёх работ сняты с запущенных локальных версий. Содержимое
            интерфейсов не перерисовано генератором изображений. Иллюстрации
            блюд внутри исходного меню FARO созданы ИИ и показывают вымышленные
            блюда; их происхождение описано в материалах FARO.
          </p>
          <p>
            Wordflow показан на отдельном учебном наборе из шести слов. Реальные
            профили, рабочая база, Telegram-авторизация и облачная синхронизация
            не используются во встроенном демо.
          </p>
          <p>
            Монолит, композиция экспонатов, свет и переходы относятся к новой
            сцене портфолио. Они дополняют оригинальные проекты; отдельные кейсы
            описывают это различие.
          </p>
        </section>
        <section className="credits-section" aria-labelledby="credits-projects">
          <h2 id="credits-projects">Исходные проекты</h2>
          <ul className="credits-project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <External href={project.repository}>
                  {project.title} <Arrow />
                </External>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
