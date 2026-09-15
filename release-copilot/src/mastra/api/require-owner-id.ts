import { MASTRA_RESOURCE_ID_KEY } from '@mastra/core/request-context';

interface OwnerIdContext {
  get: (key: 'requestContext') => {
    get: (key: typeof MASTRA_RESOURCE_ID_KEY) => unknown;
  };
  json: (body: { error: string }, status: 401) => Response;
}

// Shared by every route that scopes its data by the authenticated caller.
// Returns the ownerId, or an already-built 401 Response the caller should
// return as-is — `typeof result !== 'string'` tells them which.
export const requireOwnerId = <T extends OwnerIdContext>(
  context: T,
): string | Response => {
  const ownerId = context.get('requestContext').get(MASTRA_RESOURCE_ID_KEY) as
    | string
    | undefined;

  return ownerId ?? context.json({ error: 'Unauthorized.' }, 401);
};
