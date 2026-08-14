// Shared text-building utilities — for long prose (tool descriptions, Zod
// `.describe()` text, prompt fragments) that needs to stay readable as multiple
// lines in the source but reach the LLM as a single unbroken string.

// Joins wrapped source lines into one space-separated string.
export const joinLines = (...lines: string[]): string => lines.join(' ');
