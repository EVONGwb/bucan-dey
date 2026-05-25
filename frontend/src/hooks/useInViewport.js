import { useEffect, useRef, useState } from "react";

export function useInViewport(rootMargin = "320px") {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || isVisible) return undefined;

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, rootMargin]);

  return [ref, isVisible];
}
