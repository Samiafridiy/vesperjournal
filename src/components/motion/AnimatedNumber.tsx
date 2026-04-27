import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

/**
 * Smoothly counts up to a target number when scrolled into view.
 * Uses requestAnimationFrame for buttery 60fps animation.
 */
export function AnimatedNumber({
  value,
  duration = 1200,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!inView) return;
    if (startedRef.current && fromRef.current === value) return;
    startedRef.current = true;
    const from = fromRef.current;
    const to = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}