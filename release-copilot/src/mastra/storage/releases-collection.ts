import type { CollectionSchema } from '@mastra/core/storage';

export const RELEASES_COLLECTION_NAME = 'releases';

export const releasesCollectionSchema: CollectionSchema = {
  name: RELEASES_COLLECTION_NAME,
  columns: {
    id: { type: 'uuid-pk' },
    owner_id: { type: 'text' },
    version: { type: 'text' },
    title: { type: 'text' },
    release_date: { type: 'text' },
    title_override: { type: 'text', nullable: true },
    status: { type: 'text', default: 'draft' },
    github_body: { type: 'text' },
    app_store_body: { type: 'text', nullable: true },
    google_play_body: { type: 'text', nullable: true },
    platforms_json: { type: 'json', default: '[]' },
    entries_json: { type: 'json' },
    feat_count: { type: 'integer' },
    fix_count: { type: 'integer' },
    created_at: { type: 'timestamp' },
  },
  indexes: [
    { name: 'idx_releases_owner_created', columns: ['owner_id', 'created_at'] },
  ],
};
