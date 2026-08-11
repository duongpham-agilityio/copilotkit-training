import { resolve } from 'node:path';

// `mastra dev` spawns the built server with cwd under `.mastra/output`, not the project
// root, so a relative path in `Agent({ skills: [...] })` never resolves (LocalSkillSource
// resolves relative skill paths against `process.cwd()`). The Mastra CLI sets
// MASTRA_PROJECT_ROOT on that child process; fall back to `process.cwd()` for contexts
// where it isn't set (e.g. tests run from the project root).
export const resolveSkillPath = (relativePath: string): string =>
  resolve(process.env.MASTRA_PROJECT_ROOT ?? process.cwd(), relativePath);
