import { releaseCopilotFactoryStorage } from './factory-storage';
import { RELEASES_COLLECTION_NAME } from './releases-collection';
import { ReleaseEntrySchema, type ReleaseEntry } from '../../types/release-entry';
import {
  PlatformDraftSchema,
  type PlatformDraft,
} from '../../types/release-notes-draft';
import { ReleaseStatus } from '../../types/release';
import { CommitType } from '../../types/commit';

interface ReleaseRow {
  [key: string]: unknown;
  id: string;
  owner_id: string;
  version: string;
  title: string;
  release_date: string;
  title_override: string | null;
  status: string;
  github_body: string;
  app_store_body: string | null;
  google_play_body: string | null;
  platforms_json: unknown;
  entries_json: unknown;
  feat_count: number;
  fix_count: number;
  created_at: Date;
}

export interface InsertReleaseInput {
  ownerId: string;
  version: string;
  title: string;
  releaseDate: string;
  titleOverride?: string;
  github: string;
  appStore?: string;
  googlePlay?: string;
  platforms: PlatformDraft[];
  entries: ReleaseEntry[];
}

export interface ReleaseRecord {
  id: string;
  version: string;
  title: string;
  releaseDate: string;
  titleOverride: string | null;
  status: ReleaseStatus;
  github: string;
  appStore: string | null;
  googlePlay: string | null;
  platforms: PlatformDraft[];
  entries: ReleaseEntry[];
  featCount: number;
  fixCount: number;
  createdAt: string;
}

const toReleaseRecord = (row: ReleaseRow): ReleaseRecord => ({
  id: row.id,
  version: row.version,
  title: row.title,
  releaseDate: row.release_date,
  titleOverride: row.title_override,
  status: row.status as ReleaseStatus,
  github: row.github_body,
  appStore: row.app_store_body,
  googlePlay: row.google_play_body,
  platforms: PlatformDraftSchema.array().parse(row.platforms_json),
  entries: ReleaseEntrySchema.array().parse(row.entries_json),
  featCount: row.feat_count,
  fixCount: row.fix_count,
  createdAt: row.created_at.toISOString(),
});

export const insertRelease = async (
  input: InsertReleaseInput,
): Promise<ReleaseRecord> => {
  const row = await releaseCopilotFactoryStorage.ops.insertOne<ReleaseRow>(
    RELEASES_COLLECTION_NAME,
    {
      owner_id: input.ownerId,
      version: input.version,
      title: input.title,
      release_date: input.releaseDate,
      title_override: input.titleOverride ?? null,
      status: ReleaseStatus.Draft,
      github_body: input.github,
      app_store_body: input.appStore ?? null,
      google_play_body: input.googlePlay ?? null,
      platforms_json: input.platforms,
      entries_json: input.entries,
      feat_count: input.entries.filter((entry) => entry.type === CommitType.Feat)
        .length,
      fix_count: input.entries.filter((entry) => entry.type === CommitType.Fix)
        .length,
      created_at: new Date(),
    },
  );

  return toReleaseRecord(row);
};

export interface ListReleasesInput {
  ownerId: string;
  limit?: number;
  cursor?: string;
}

export interface ListReleasesResult {
  releases: ReleaseRecord[];
  nextCursor: string | null;
}

const DEFAULT_LIST_LIMIT = 20;

export const listReleases = async ({
  ownerId,
  limit = DEFAULT_LIST_LIMIT,
  cursor,
}: ListReleasesInput): Promise<ListReleasesResult> => {
  const rows = await releaseCopilotFactoryStorage.ops.findMany<ReleaseRow>(
    RELEASES_COLLECTION_NAME,
    { owner_id: ownerId },
    {
      orderBy: [['created_at', 'desc']],
      limit,
      cursor: cursor ? { values: [new Date(cursor)] } : undefined,
    },
  );

  const releases = rows.map(toReleaseRecord);
  const last = releases.at(-1);

  return {
    releases,
    nextCursor: releases.length === limit && last ? last.createdAt : null,
  };
};

export const getRelease = async ({
  id,
  ownerId,
}: {
  id: string;
  ownerId: string;
}): Promise<ReleaseRecord | null> => {
  const row = await releaseCopilotFactoryStorage.ops.findOne<ReleaseRow>(
    RELEASES_COLLECTION_NAME,
    { id, owner_id: ownerId },
  );

  return row ? toReleaseRecord(row) : null;
};
