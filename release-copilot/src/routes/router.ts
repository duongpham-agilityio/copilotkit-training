import { createBrowserRouter } from 'react-router';
import App from '../App.tsx';
import DashboardPage from './DashboardPage.tsx';
import HistoryPage from './HistoryPage.tsx';
import RouteErrorPage from './RouteErrorPage.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    ErrorBoundary: RouteErrorPage,
    children: [
      { index: true, Component: DashboardPage },
      { path: 'history', Component: HistoryPage },
    ],
  },
]);
