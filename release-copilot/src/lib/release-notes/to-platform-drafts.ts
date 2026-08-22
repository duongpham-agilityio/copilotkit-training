import {
  APP_STORE_CHARACTER_LIMIT,
  GOOGLE_PLAY_CHARACTER_LIMIT,
} from '@/constants/release-notes.ts';
import { KnownPlatformId } from '@/types/platform.ts';
import type {
  PlatformDraft,
  ReleaseNotesDraft,
} from '@/types/release-notes-draft.ts';

// GitHub is not part of this function's output — it takes its own path to the
// left panel and never appears alongside the platform cards.
export const toPlatformDrafts = (draft: ReleaseNotesDraft): PlatformDraft[] => {
  const named: PlatformDraft[] = [];

  if (draft.appStore) {
    named.push({
      platformId: KnownPlatformId.AppStore,
      label: 'App Store',
      body: draft.appStore,
      characterLimit: APP_STORE_CHARACTER_LIMIT,
    });
  }

  if (draft.googlePlay) {
    named.push({
      platformId: KnownPlatformId.GooglePlay,
      label: 'Google Play',
      body: draft.googlePlay,
      characterLimit: GOOGLE_PLAY_CHARACTER_LIMIT,
    });
  }

  // Named fields win on a platformId collision — the dynamic entry is dropped
  // rather than duplicating the card.
  const taken = new Set<string>([
    ...named.map((platformDraft) => platformDraft.platformId),
    KnownPlatformId.Github,
  ]);

  // `props.parameters` on the client is the model's raw JSON, parsed via
  // CopilotKit's partialJSONParse (no Zod re-validation, no `.default([])`
  // applied) — the model can legally omit `platforms` entirely, so this can be
  // `undefined` at runtime despite the schema-derived type saying otherwise.
  const extra = (draft.platforms ?? []).filter((platformDraft) => {
    if (taken.has(platformDraft.platformId)) {
      console.warn(
        `[toPlatformDrafts] dropped dynamic platform "${platformDraft.platformId}" — collides with a named field.`,
      );
      return false;
    }
    return true;
  });

  return [...named, ...extra];
};
