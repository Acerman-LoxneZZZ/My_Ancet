import { useRef, useState } from "react";
import { Arrow } from "./Icon";
export function Showreel() {
  const dialog = useRef<HTMLDialogElement>(null),
    video = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const open = () => {
    setLoaded(true);
    dialog.current?.showModal();
  };
  const stop = () => video.current?.pause();
  return (
    <>
      <button className="text-action" onClick={open}>
        Смотреть шоурил <span className="meta">0:22</span>
        <Arrow direction="right" />
      </button>
      <dialog
        className="video-dialog"
        aria-label="Шоурил LOXNE"
        ref={dialog}
        onClose={stop}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <button
          className="dialog-close"
          onClick={() => dialog.current?.close()}
        >
          Закрыть <span aria-hidden="true">×</span>
        </button>
        {loaded && (
          <video
            ref={video}
            src="/assets/video/portfolio-showreel.mp4"
            poster="/assets/images/showreel-poster.jpg"
            controls
            playsInline
            preload="metadata"
          />
        )}
        <p>LOXNE · Миры под поверхностью · 22 секунды</p>
      </dialog>
    </>
  );
}
