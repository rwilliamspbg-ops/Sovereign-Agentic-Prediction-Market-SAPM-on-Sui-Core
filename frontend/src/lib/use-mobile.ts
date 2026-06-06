'use client';

import { useState, useEffect } from 'react';

/**
 * Mobile detection and responsive utilities hook
 */
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [touchEnabled, setTouchEnabled] = useState(false);

  useEffect(() => {
    // Detect device type
    const checkDeviceType = () => {
      if (window.innerWidth < 640) {
        setIsMobile(true);
        setIsTablet(false);
      } else if (window.innerWidth >= 640 && window.innerWidth < 1024) {
        setIsMobile(false);
        setIsTablet(true);
      } else {
        setIsMobile(false);
        setIsTablet(false);
      }

      // Detect touch capability
      setTouchEnabled('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkDeviceType();

    // Listen for resize events
    const handleResize = () => {
      checkDeviceType();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile,
    isTablet,
    touchEnabled,
    breakpoint: isMobile ? 'sm' : isTablet ? 'md' : 'lg',
  };
};

/**
 * Touch gesture utilities for mobile optimization
 */
export interface TouchGestureOptions {
  minTapTarget?: number; // Minimum touch target size (default: 44px)
  swipeThreshold?: number; // Distance to trigger swipe gesture
}

export const useTouchGestures = (options: TouchGestureOptions = {}) => {
  const { minTapTarget = 44, swipeThreshold = 50 } = options;

  return {
    minTapTarget,
    swipeThreshold,
    // Helper to check if element meets touch target requirements
    meetsTouchTarget: (width: number, height: number) => 
      width >= minTapTarget && height >= minTapTarget,
  };
};

export default useMobile;
