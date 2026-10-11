let locks = 0;
let previousPadding = "";
let previousOverflow = "";

export function lockScroll() {
  if (typeof document === "undefined") return () => {};
  locks += 1;
  if (locks === 1) {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    previousPadding = document.body.style.paddingRight;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${scrollbar}px`;
    }
  }
  return () => unlockScroll();
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  locks = Math.max(0, locks - 1);
  if (locks === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPadding;
  }
}
