import {useEffect, useRef} from "react";
import "../styles/reactive-name.css";

type Props = { name: string; as?: "h1" | "h2" };

/** A readable heading whose highlights and letterforms respond to the pointer. */
export function ReactiveName({ name, as: Heading = "h1" }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const element = heading.current;
    if (!element) return;
    const cells = [...element.querySelectorAll<HTMLElement>(".reactive-name__letter")];
    const glyphs = cells.map(cell => cell.querySelector<HTMLElement>(".reactive-name__glyph")!);
    const values = new Float64Array(cells.length);
    const targets = new Float64Array(cells.length);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let rectangles: DOMRect[] = [];
    let geometryDirty = true;
    let visible = true;
    let disposed = false;
    let frame = 0;
    let previousTime: number | undefined;
    const reduced = () => motion.matches || document.documentElement.dataset.motion === "reduced";

    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = undefined;
      values.fill(0);
      targets.fill(0);
      glyphs.forEach(glyph => {
        glyph.style.removeProperty("--letter-proximity");
        glyph.style.removeProperty("--shine-x");
      });
      delete element.dataset.animating;
    };

    const animate = (time: number) => {
      frame = 0;
      if (disposed) return;
      if (reduced() || !visible || document.hidden) {reset(); return;}
      const dt = Math.max(0.001, (time - (previousTime ?? time - 1000 / 60)) / 1000);
      previousTime = time;
      let unsettled = false;
      glyphs.forEach((glyph, index) => {
        const difference = targets[index] - values[index];
        const duration = difference > 0 ? 0.095 : 0.17;
        values[index] += difference * (1 - Math.exp(-dt / duration));
        if (Math.abs(targets[index] - values[index]) < 0.0008) values[index] = targets[index];
        else unsettled = true;
        glyph.style.setProperty("--letter-proximity", values[index].toFixed(4));
      });
      if (unsettled) frame = requestAnimationFrame(animate);
      else {previousTime = undefined; delete element.dataset.animating;}
    };

    const wake = () => {
      if (frame || disposed || reduced() || !visible || document.hidden) return;
      if (!values.some((value, index) => Math.abs(value - targets[index]) > 0.0008)) return;
      element.dataset.animating = "true";
      frame = requestAnimationFrame(animate);
    };

    const release = () => {targets.fill(0); wake();};
    const invalidate = () => {geometryDirty = true;};
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      if (reduced() || !visible || document.hidden) return;
      if (geometryDirty) {
        // The cells never transform or change width, so measurements remain
        // stable while the glyphs themselves stretch and vary in weight.
        rectangles = cells.map(cell => cell.getBoundingClientRect());
        geometryDirty = false;
      }
      rectangles.forEach((rect, index) => {
        const radius = Math.max(96, rect.height * 1.25);
        const dx = (event.clientX - (rect.left + rect.width / 2)) / radius;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / (radius * 0.72);
        const influence = Math.max(0, 1 - Math.hypot(dx, dy));
        targets[index] = influence * influence * (3 - 2 * influence);
        if (influence > 0) {
          const shine = (event.clientX - rect.left) / rect.width;
          glyphs[index].style.setProperty("--shine-x", `${Math.max(0, Math.min(1, shine)) * 100}%`);
        }
      });
      wake();
    };
    const changeMotion = () => {geometryDirty = true; if (reduced()) reset();};
    const changeVisibility = () => {if (document.hidden) reset(); else geometryDirty = true;};
    const resize = new ResizeObserver(invalidate);
    resize.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      geometryDirty = true;
      if (!visible) reset();
    });
    intersection.observe(element);
    const motionAttribute = new MutationObserver(changeMotion);
    motionAttribute.observe(document.documentElement, {attributes: true, attributeFilter: ["data-motion"]});
    document.fonts.ready.then(() => {if (!disposed) geometryDirty = true;});
    element.addEventListener("pointermove", pointer, {passive: true});
    element.addEventListener("pointerleave", release);
    element.addEventListener("pointercancel", release);
    window.addEventListener("blur", reset);
    window.addEventListener("scroll", invalidate, {passive: true});
    window.addEventListener("resize", invalidate, {passive: true});
    document.addEventListener("visibilitychange", changeVisibility);
    motion.addEventListener("change", changeMotion);

    return () => {
      disposed = true;
      reset();
      resize.disconnect();
      intersection.disconnect();
      motionAttribute.disconnect();
      element.removeEventListener("pointermove", pointer);
      element.removeEventListener("pointerleave", release);
      element.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", reset);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      document.removeEventListener("visibilitychange", changeVisibility);
      motion.removeEventListener("change", changeMotion);
    };
  }, [name, Heading]);

  return <Heading ref={heading} className="reactive-name" aria-label={name} tabIndex={-1}>
    <span className="reactive-name__word" aria-hidden="true">
      {[...name].map((letter, index) => <span className="reactive-name__letter" data-letter={letter} key={index}>
        <span className="reactive-name__glyph">{letter}</span>
      </span>)}
    </span>
  </Heading>;
}
