import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

interface NavigationGuardProps {
  children: React.ReactNode;
}

export const NavigationGuard: React.FC<NavigationGuardProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    // Intercept hardware/browser back button (POP action)
    if (navigationType === 'POP') {
      const isAtHome = location.pathname === '/' || location.pathname === '/dashboard';
      
      // If we popped from a non-home page, we want to ensure we don't just "go back" 
      // to a random tab we clicked. We want to guide the user towards the Dashboard.
      if (!isAtHome && lastPathRef.current !== location.pathname) {
        // This is a browser back button press
        // If they are deep-linked or in a sub-page, redirected them to Home 
        // instead of whatever was in history stack if it's a "messy" history.
        
        // For sub-pages like /players/123, ideally back should go to /players
        const pathParts = location.pathname.split('/').filter(Boolean);
        if (pathParts.length > 1) {
          // If we are at /players/123, we stay here but handle the NEXT back button
          // Actually, React Router already updated the location.
        }
      }
    }
    
    lastPathRef.current = location.pathname;
  }, [location, navigationType]);

  // Handle the physical back button / swipe specifically for Android/iOS
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const isAtHome = window.location.hash === '#/' || window.location.pathname === '/';
      
      if (isAtHome) {
        // We are at the root. We might want to prevent exit or show toast.
        // For now, let's just log it. In a real PWA you might trigger a "Press again to exit".
      } else {
        // If not at home, we let React Router handle the transition, 
        // but our level-based replace logic in useSmartNavigate should have 
        // kept the history stack clean anyway.
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return <>{children}</>;
};
