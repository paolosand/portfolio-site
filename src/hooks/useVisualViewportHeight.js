import { useEffect, useState } from 'react';

// The one measurement that reflects the real visible area once a mobile
// keyboard opens: window.innerHeight / 100dvh don't shrink on iOS Safari
// when the keyboard appears, but visualViewport.height does everywhere.
export function useVisualViewportHeight() {
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight,
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setHeight(vv.height);
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}
