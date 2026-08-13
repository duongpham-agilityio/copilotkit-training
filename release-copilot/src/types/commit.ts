export const enum CommitType {
  Feat = 'feat',
  Fix = 'fix',
  Chore = 'chore',
}

export interface Commit {
  hash: string;
  type: CommitType;
  message: string;
  author: string;
  timestamp: string;
}
