import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type AnchorHTMLAttributes,
} from "react";
import { flushSync } from "react-dom";
import { useHref, useLocation, useNavigate, type Location } from "react-router-dom";
import { gsap } from "gsap";
import {
  createTransitionController,
  type NavigationRequest,
} from "./TransitionController";
import {
  ScrollMemory,
  resolveGalleryReturn,
  type ScrollSnapshot,
} from "./ScrollMemory";
import { currentSnapshot, chapterMetrics } from "../experience/domStory";
import { resolveScrollDestination } from "./restoreDestination";
import type { ProjectId } from "../experience/types";

type Context = {
  display: Location;
  busy: boolean;
  go: (path: string, project?: ProjectId) => void;
};
const NavigationContext = createContext<Context | null>(null);
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const reducedMotion = () =>
  document.documentElement.dataset.motion === "reduced" ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const names: Record<string, string> = {
  "/": "Миры под поверхностью",
  "/work/timepiece": "Ход времени",
  "/work/faro": "FARO",
  "/work/egypt": "Египет",
  "/work/proyavleno": "ПРОЯВЛЕНО",
  "/work/dal": "ДАЛЬ",
  "/work/tutor": "3D-репетитор",
  "/work/castle": "Замок",
  "/work/wordflow": "Wordflow",
  "/credits": "Источники",
};
export function NavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation(),
    navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [display, setDisplay] = useState(location),
    [busy, setBusy] = useState(false),
    [label, setLabel] = useState("");
  const displayed = useRef(display);
  displayed.current = display;
  const actual = useRef(location);
  actual.current = location;
  const curtain = useRef<HTMLDivElement>(null);
  const memory = useRef(new ScrollMemory());
  const gallery = useRef<ScrollSnapshot | undefined>(undefined);
  const internal = useRef<string | null>(null);
  const controller = useRef<ReturnType<
    typeof createTransitionController
  > | null>(null);
  const animate = (vars: gsap.TweenVars) =>
    new Promise<void>((resolve) => {
      if (!curtain.current) return resolve();
      gsap.to(curtain.current, {
        ...vars,
        y: 0,
        onComplete: resolve,
        onInterrupt: resolve,
      });
    });
  useEffect(() => {
    const oldRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    // Reset the pixel component parsed from the CSS percentage transform.
    gsap.set(curtain.current, { y: 0, yPercent: 112 });
    controller.current = createTransitionController({
      cover: async (req) => {
        const snapshot = currentSnapshot();
        memory.current.save(displayed.current.key, snapshot);
        if (displayed.current.pathname === "/") gallery.current = snapshot;
        setLabel(names[req.path.split("#")[0]] || "LOXNE");
        setBusy(true);
        if (reducedMotion()) {
          await animate({ yPercent: 0, duration: 0.08 });
          return;
        }
        gsap.set(curtain.current, { y: 0, yPercent: 112 });
        await animate({ yPercent: 0, duration: 0.48, ease: "power3.inOut" });
      },
      swap: async (req) => {
        const url = new URL(req.path, window.location.origin);
        const target =
          req.kind === "pop"
            ? (req.payload as Location)
            : {
                pathname: url.pathname,
                search: url.search,
                hash: url.hash,
                state: null,
                key: req.key,
              };
        if (req.kind !== "pop") {
          internal.current = req.path;
          navigateRef.current(req.path, { replace: req.kind === "replace" });
        }
        flushSync(() => setDisplay(target));
        await nextFrame();
        let snapshot: ScrollSnapshot | undefined;
        if (typeof req.scroll === "object")
          snapshot = resolveGalleryReturn(
            req.scroll.project as ProjectId,
            gallery.current,
          );
        else if (req.kind === "pop") snapshot = memory.current.get(target.key);
        else if (req.scroll === "restore") snapshot = gallery.current;
        const hashEl = url.hash
          ? document.getElementById(decodeURIComponent(url.hash.slice(1)))
          : null;
        const destination = resolveScrollDestination(
          req.kind,
          snapshot,
          hashEl
            ? hashEl.getBoundingClientRect().top + window.scrollY - 90
            : undefined,
          chapterMetrics(),
        );
        window.scrollTo({ top: destination.top, behavior: "instant" });
        const restoredChapter =
          snapshot?.chapter ||
          (typeof req.scroll === "object" ? req.scroll.project : undefined);
        const restoredFocus =
          destination.source === "snapshot" &&
          snapshot &&
          ((snapshot.focusId && document.getElementById(snapshot.focusId)) ||
            (restoredChapter &&
              document.getElementById(`world-${restoredChapter}-title`)));
        const focus =
          restoredFocus ||
          (destination.source === "hash" && hashEl) ||
          document.querySelector<HTMLElement>("main h1");
        if (focus) {
          if (!focus.hasAttribute("tabindex") && focus.tabIndex < 0)
            focus.tabIndex = -1;
          focus.focus({ preventScroll: true });
        }
        document.title = `${names[target.pathname] || "Страница не найдена"} — LOXNE`;
        window.dispatchEvent(new Event("portfolio:navigated"));
      },
      uncover: async () => {
        await animate({
          yPercent: -112,
          duration: reducedMotion() ? 0.08 : 0.5,
          ease: "power3.inOut",
        });
        setBusy(false);
      },
      onError: (error) => {
        console.error("Navigation recovered", error);
        gsap.set(curtain.current, { y: 0, yPercent: -112 });
        setBusy(false);
      },
    });
    return () => {
      controller.current?.dispose();
      gsap.killTweensOf(curtain.current);
      history.scrollRestoration = oldRestoration;
    };
  }, []);
  useEffect(() => {
    const path = location.pathname + location.search + location.hash;
    if (internal.current === path) {
      internal.current = null;
      setDisplay(location);
      return;
    }
    if (location.key !== displayed.current.key) {
      controller.current?.request({
        key: location.key,
        path,
        kind: "pop",
        scroll: "restore",
        payload: location,
      });
    }
  }, [location]);
  const go = (path: string, project?: ProjectId) => {
    const sameLocation =
      path ===
      actual.current.pathname + actual.current.search + actual.current.hash;
    controller.current?.request({
      key: crypto.randomUUID(),
      path,
      kind: sameLocation ? "replace" : "push",
      scroll: project ? { project } : "top",
    });
  };
  return (
    <NavigationContext.Provider value={{ display, busy, go }}>
      {children}
      <div className="transition-curtain" ref={curtain} aria-hidden="true">
        <span className="curtain-mark" />
        <span>{label}</span>
        <small>LOXNE / Избранное</small>
      </div>
    </NavigationContext.Provider>
  );
}
export function usePortfolioNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw Error("NavigationProvider is missing");
  return context;
}
export function PortfolioLink({
  to,
  project,
  onClick,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  project?: ProjectId;
}) {
  const { go } = usePortfolioNavigation();
  const href = useHref(to);
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === "_blank"
        )
          return;
        event.preventDefault();
        go(to, project);
      }}
    >
      {children}
    </a>
  );
}
