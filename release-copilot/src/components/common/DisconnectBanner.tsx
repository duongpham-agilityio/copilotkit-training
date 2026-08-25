import { WifiOff } from 'lucide-react';
import { useRuntimeConnection } from '@/hooks/use-runtime-connection.ts';

const DisconnectBanner = () => {
  const { isDisconnected } = useRuntimeConnection();

  if (!isDisconnected) return null;

  return (
    <div
      role="alert"
      className="bg-error/10 text-error text-body-md flex shrink-0 items-center justify-center gap-2 px-6 py-2"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Can't reach the Mastra server — the copilot is offline. Start it with{' '}
        <code className="font-mono">pnpm dev:mastra</code>, then reload.
      </span>
    </div>
  );
};

export default DisconnectBanner;
