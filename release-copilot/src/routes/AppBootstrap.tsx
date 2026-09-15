import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/hooks/use-auth.ts';
import { AuthStatus } from '@/store/auth-store.ts';
import { ROUTE_DASHBOARD, ROUTE_SIGN_IN } from '@/constants/routings.ts';

const AppBootstrap = () => {
  const location = useLocation();
  const { status } = useAuth();

  useEffect(() => {
    if (status !== AuthStatus.Loading) {
      const splashScreen = document.getElementById('splash-screen');

      if (splashScreen) {
        splashScreen.style.display = 'none';
      }
    }
  }, [status]);

  if (status === AuthStatus.Loading) {
    return <div className="min-h-screen bg-transparent" />;
  }

  const isSignInRoute = location.pathname === ROUTE_SIGN_IN;

  if (status === AuthStatus.SignedOut && !isSignInRoute) {
    return <Navigate to={ROUTE_SIGN_IN} replace />;
  }

  if (status === AuthStatus.SignedIn && isSignInRoute) {
    return <Navigate to={ROUTE_DASHBOARD} replace />;
  }

  return <Outlet />;
};

export default AppBootstrap;
