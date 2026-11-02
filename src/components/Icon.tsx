export function Arrow({
  direction = "up",
}: {
  direction?: "up" | "right" | "down" | "left";
}) {
  const d =
    direction === "up"
      ? "M4 14 14 4M4 4h10v10"
      : direction === "down"
        ? "M9 3v12m-5-5 5 5 5-5"
        : direction === "left"
          ? "M15 9H3m5-5L3 9l5 5"
          : "M3 9h12m-5-5 5 5-5 5";
  return (
    <svg
      className="icon"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
export function Mark() {
  return (
    <svg
      className="mark"
      width="28"
      height="32"
      viewBox="0 0 40 48"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M0 0h8v48H0zM14 0h26L16 23l-6-8zM18 28l22 20H15l-5-10z" />
    </svg>
  );
}
