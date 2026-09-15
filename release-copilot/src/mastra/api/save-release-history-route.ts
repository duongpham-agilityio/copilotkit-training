import { registerApiRoute } from '@mastra/core/server';
import { SaveReleaseHistoryRequestSchema } from '../../types/save-release-history-request';
import { insertRelease } from '../storage/releases-repository';
import { RELEASE_HISTORY_ROUTE_PATH } from '../../constants/endpoints';
import { formatReleaseDate } from '../../lib/release-notes/release-title';
import { requireOwnerId } from './require-owner-id';

export const saveReleaseHistoryRoute = registerApiRoute(
  RELEASE_HISTORY_ROUTE_PATH,
  {
    method: 'POST',
    handler: async (context) => {
      const ownerId = requireOwnerId(context);
      if (typeof ownerId !== 'string') {
        return ownerId;
      }

      let body: unknown;
      try {
        body = await context.req.json();
      } catch {
        return context.json({ error: 'Request body is not valid JSON.' }, 400);
      }

      const parsed = SaveReleaseHistoryRequestSchema.safeParse(body);
      if (!parsed.success) {
        return context.json({ error: parsed.error.message }, 400);
      }

      try {
        const release = await insertRelease({
          ownerId,
          version: parsed.data.version,
          title: parsed.data.title,
          releaseDate: parsed.data.releaseDate ?? formatReleaseDate(),
          titleOverride: parsed.data.titleOverride ?? undefined,
          github: parsed.data.github,
          appStore: parsed.data.appStore ?? undefined,
          googlePlay: parsed.data.googlePlay ?? undefined,
          platforms: parsed.data.platforms,
          entries: parsed.data.entries,
        });

        return context.json({ id: release.id }, 201);
      } catch (error) {
        return context.json(
          { error: error instanceof Error ? error.message : String(error) },
          502,
        );
      }
    },
  },
);
