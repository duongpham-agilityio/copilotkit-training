import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CopilotKit } from '@copilotkit/react-core';

const queryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <QueryClientProvider client={queryClient}>
    <CopilotKit runtimeUrl={import.meta.env.VITE_COPILOTKIT_RUNTIME_URL}>
      {children}
    </CopilotKit>
  </QueryClientProvider>
);

export default AppProviders;
