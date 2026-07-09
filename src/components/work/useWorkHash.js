import { useCallback, useEffect, useRef, useState } from 'react';
import { workRegistry } from '../../data/work/index.js';
import { isWorkHashShaped, parseWorkHash, workHashFor } from './workHash.js';

// Drives the case-study modal from the URL hash (#/work/<id>) so every
// open modal is a shareable link and the back button closes it.
export function useWorkHash() {
  const [openId, setOpenId] = useState(
    () => parseWorkHash(window.location.hash, workRegistry),
  );
  const pushedRef = useRef(false);

  useEffect(() => {
    // A work-shaped hash for an unknown id (stale link) is cleared silently.
    if (isWorkHashShaped(window.location.hash) && !openId) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const onHashChange = () => {
      const id = parseWorkHash(window.location.hash, workRegistry);
      setOpenId(id);
      if (!id) pushedRef.current = false;
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useCallback((id) => {
    pushedRef.current = true;
    window.location.hash = workHashFor(id); // adds history entry, fires hashchange
  }, []);

  const close = useCallback(() => {
    if (pushedRef.current) {
      history.back(); // hashchange handler does the closing
    } else {
      // Cold deep-link load: nothing to go back to; clear without new entry.
      history.replaceState(null, '', window.location.pathname + window.location.search);
      setOpenId(null);
    }
  }, []);

  return { openId, open, close };
}
