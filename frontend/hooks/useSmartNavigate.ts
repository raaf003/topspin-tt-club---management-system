import { useNavigate, useLocation, NavigateOptions } from 'react-router-dom';

export type NavigationLevel = 'primary' | 'sub';

export const useSmartNavigate = () => {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Smart navigate function
   * @param to Target path
   * @param options Navigation options or level
   */
  const smartNavigate = (
    to: string, 
    options?: NavigateOptions | NavigationLevel
  ) => {
    if (typeof options === 'string') {
      // If level is provided, use hierarchical logic
      if (options === 'primary') {
        navigate(to, { replace: true });
      } else {
        navigate(to);
      }
    } else {
      // Use standard options if provided
      navigate(to, options);
    }
  };

  /**
   * Smart back function
   * If on a sub-page, goes back to dashboard or parent
   */
  const goBack = () => {
    const isAtHome = location.pathname === '/' || location.pathname === '/dashboard';
    
    if (isAtHome) {
      // Already at home, let the browser handle exit or do nothing
      return;
    }

    // Check if we are at a nested level (e.g., /players/:id)
    const pathParts = location.pathname.split('/').filter(Boolean);
    
    if (pathParts.length > 1) {
      // We are in a sub-page (e.g., /players/123), go to parent (/players)
      const parentPath = `/${pathParts.slice(0, -1).join('/')}`;
      navigate(parentPath, { replace: true });
    } else {
      // We are at a top-level page (e.g., /matches), go to Dashboard
      navigate('/', { replace: true });
    }
  };

  return { 
    navigate: smartNavigate, 
    goBack,
    currentPath: location.pathname
  };
};
