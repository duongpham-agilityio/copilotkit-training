import type { ReactNode } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CopilotKit } from '@copilotkit/react-core/v2';
import ErrorBoundary, {
  ErrorBoundaryVariant,
} from '@/components/common/ErrorBoundary.tsx';

const MAX_QUERY_RETRIES = 2;

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) =>
      console.error(`[query] ${String(query.queryKey)} failed`, error),
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !error.message.includes('is not set') && failureCount < MAX_QUERY_RETRIES,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <ErrorBoundary title="The app crashed" variant={ErrorBoundaryVariant.Page}>
    <QueryClientProvider client={queryClient}>
      <CopilotKit runtimeUrl={import.meta.env.VITE_COPILOTKIT_RUNTIME_URL}>
        {children}
      </CopilotKit>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default AppProviders;
