import { useRef, type ReactNode } from "react";
export function MediaViewer({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className="media-open"
        onClick={() => ref.current?.showModal()}
        aria-label={`Увеличить: ${alt}`}
      >
        {children}
      </button>
      <dialog
        ref={ref}
        aria-label={alt}
        className="media-dialog"
        onClick={(event) => {
          if (event.target === ref.current) ref.current.close();
        }}
      >
        <button className="dialog-close" onClick={() => ref.current?.close()}>
          Закрыть <span aria-hidden="true">×</span>
        </button>
        <img src={src} alt={alt} />
        <p>{alt}</p>
      </dialog>
    </>
  );
}
