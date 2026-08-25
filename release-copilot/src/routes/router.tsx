import { createBrowserRouter } from 'react-router';
import App from '../App.tsx';
import RouteErrorPage from './RouteErrorPage.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteErrorPage />,
  },
]);
