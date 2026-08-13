export const enum ReleaseStatus {
  Published = 'published',
  Draft = 'draft',
  Archived = 'archived',
}

export interface ReleaseSummary {
  version: string;
  status: ReleaseStatus;
  title: string;
  date: string;
  featCount: number;
  fixCount: number;
}
