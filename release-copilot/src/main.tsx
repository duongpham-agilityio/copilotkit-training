import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './index.css';
import '@copilotkit/react-core/v2/styles.css';
import '@/styles/copilotkit-theme.css';
import { router } from './routes/router.tsx';
import AppProviders from './providers/AppProviders.tsx';
import ChatSidebar from './components/chat/ChatSidebar.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
      <ChatSidebar />
    </AppProviders>
  </StrictMode>,
);
