
import { useState, useEffect, useRef } from 'react';

export function useIdleTimer({ timeout, onIdle, onActive }) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef(null);

  const handleIdle = () => {
    setIsIdle(true);
    if (onIdle) {
      onIdle();
    }
  };

  const handleActive = () => {
    if (isIdle) {
      setIsIdle(false);
      if (onActive) {
        onActive();
      }
    }
    resetTimer();
  };

  const resetTimer = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleIdle, timeout);
  };

  useEffect(() => {
    resetTimer();

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, handleActive);
    });

    return () => {
      clearTimeout(timeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActive);
      });
    };
  }, [timeout, onIdle, onActive]);

  return { isIdle, resetTimer };
}
