import { useCallback, useSyncExternalStore } from 'react';
import {
  useCopilotKit,
  CopilotKitCoreRuntimeConnectionStatus,
} from '@copilotkit/react-core/v2';

interface UseRuntimeConnectionResult {
  isDisconnected: boolean;
}

export const useRuntimeConnection = (): UseRuntimeConnectionResult => {
  const { copilotkit } = useCopilotKit();

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const subscription = copilotkit.subscribe({
        onRuntimeConnectionStatusChanged: () => onStoreChange(),
      });
      return () => subscription.unsubscribe();
    },
    [copilotkit],
  );

  const status = useSyncExternalStore(
    subscribe,
    () => copilotkit.runtimeConnectionStatus,
    () => CopilotKitCoreRuntimeConnectionStatus.Connecting,
  );

  return {
    isDisconnected:
      status === CopilotKitCoreRuntimeConnectionStatus.Disconnected ||
      status === CopilotKitCoreRuntimeConnectionStatus.Error,
  };
};
