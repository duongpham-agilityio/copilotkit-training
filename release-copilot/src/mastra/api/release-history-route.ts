import { registerApiRoute } from '@mastra/core/server';
import { listReleases, getRelease } from '../storage/releases-repository';
import type { ReleaseRecord } from '../storage/releases-repository';
import {
  RELEASE_HISTORY_ROUTE_PATH,
  RELEASE_HISTORY_DETAIL_ROUTE_PATH,
} from '../../constants/endpoints';
import type { ReleaseHistoryRecord } from '../../types/release-history-record';
import { requireOwnerId } from './require-owner-id';

// ReleaseRecord (repository) and ReleaseHistoryRecord (wire type) are
// structurally identical by design — this is the one place that fact is
// asserted, so the two can diverge later without every call site guessing.
const toHistoryRecord = (release: ReleaseRecord): ReleaseHistoryRecord => release;

export const listReleaseHistoryRoute = registerApiRoute(
  RELEASE_HISTORY_ROUTE_PATH,
  {
    method: 'GET',
    handler: async (context) => {
      const ownerId = requireOwnerId(context);
      if (typeof ownerId !== 'string') {
        return ownerId;
      }

      const limitParam = context.req.query('limit');
      const cursor = context.req.query('cursor');

      const { releases, nextCursor } = await listReleases({
        ownerId,
        limit: limitParam ? Number(limitParam) : undefined,
        cursor,
      });

      return context.json({
        releases: releases.map(toHistoryRecord),
        nextCursor,
      });
    },
  },
);

export const getReleaseHistoryRoute = registerApiRoute(
  RELEASE_HISTORY_DETAIL_ROUTE_PATH,
  {
    method: 'GET',
    handler: async (context) => {
      const ownerId = requireOwnerId(context);
      if (typeof ownerId !== 'string') {
        return ownerId;
      }

      const id = context.req.param('id');
      const release = await getRelease({ id, ownerId });

      if (!release) {
        return context.json({ error: 'Release not found.' }, 404);
      }

      return context.json(toHistoryRecord(release));
    },
  },
);
