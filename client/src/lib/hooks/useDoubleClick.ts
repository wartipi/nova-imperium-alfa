import { useCallback, useRef } from 'react';

const DOUBLE_CLICK_DELAY = 500; // 500ms window for double-click detection

interface DoubleClickPosition {
  x: number;
  y: number;
}

interface UseDoubleClickOptions {
  onSingleClick?: (position: DoubleClickPosition) => void;
  onDoubleClick?: (position: DoubleClickPosition) => void;
  delay?: number;
}

/**
 * Custom hook for handling double-click detection
 * Replaces manual time/position tracking with a cleaner API
 */
export const useDoubleClick = ({
  onSingleClick,
  onDoubleClick,
  delay = DOUBLE_CLICK_DELAY
}: UseDoubleClickOptions) => {
  const lastClickTime = useRef<number>(0);
  const lastClickPosition = useRef<DoubleClickPosition | null>(null);
  const singleClickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleClick = useCallback((position: DoubleClickPosition) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime.current;
    
    // Check if this is a potential double-click
    const isWithinTimeWindow = timeDiff < delay;
    const isSamePosition = lastClickPosition.current &&
      lastClickPosition.current.x === position.x &&
      lastClickPosition.current.y === position.y;

    if (isWithinTimeWindow && isSamePosition) {
      // This is a double-click
      if (singleClickTimeout.current) {
        clearTimeout(singleClickTimeout.current);
        singleClickTimeout.current = null;
      }
      
      onDoubleClick?.(position);
      
      // Reset to prevent triple-click
      lastClickTime.current = 0;
      lastClickPosition.current = null;
    } else {
      // This might be a single click, wait to see if double-click follows
      lastClickTime.current = currentTime;
      lastClickPosition.current = position;

      // Clear any pending single-click handler
      if (singleClickTimeout.current) {
        clearTimeout(singleClickTimeout.current);
      }

      // Set timeout for single-click handler
      singleClickTimeout.current = setTimeout(() => {
        onSingleClick?.(position);
        singleClickTimeout.current = null;
      }, delay);
    }
  }, [onSingleClick, onDoubleClick, delay]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (singleClickTimeout.current) {
      clearTimeout(singleClickTimeout.current);
      singleClickTimeout.current = null;
    }
    lastClickTime.current = 0;
    lastClickPosition.current = null;
  }, []);

  return {
    handleClick,
    cleanup
  };
};