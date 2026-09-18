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
        const { version, title, releaseDate, titleOverride, platform, label, content } =
          parsed.data;
        // A request carries one platform draft; it goes into `platforms`, and the
        // legacy named-platform columns stay empty (History skips empty bodies).
        const release = await insertRelease({
          ownerId,
          version,
          title,
          releaseDate: releaseDate ?? formatReleaseDate(),
          titleOverride: titleOverride ?? undefined,
          platforms: [{ platform, label, content }],
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
