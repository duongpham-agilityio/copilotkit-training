import { PIIDetector, PromptInjectionDetector } from '@mastra/core/processors';
import { RELEASE_COPILOT_GUARDRAIL_MODEL } from '../../constants/models/model-name';
import {
  PII_DETECTOR_INSTRUCTIONS,
  PROMPT_INJECTION_DETECTOR_INSTRUCTIONS,
} from '../instructions/v2/guardrails';

// Both detectors are pure classification calls (structured output, no tools), so a
// low reasoning effort is enough and keeps the per-turn latency they add small.
const guardrailProviderOptions = {
  openai: { reasoningEffort: 'low' },
} as const;

// Runs first: a blocked turn aborts before the PII call is spent. The resulting
// `tripwire` chunk is turned into a chat reply by the @ag-ui/mastra patch, which
// streams `payload.reason` as assistant text.
export const promptInjectionDetector = new PromptInjectionDetector({
  model: RELEASE_COPILOT_GUARDRAIL_MODEL,
  detectionTypes: [
    'injection',
    'jailbreak',
    'system-override',
    'role-manipulation',
    'tool-exfiltration',
    'data-exfiltration',
  ],
  threshold: 0.8,
  strategy: 'block',
  lastMessageOnly: true,
  includeScores: true,
  providerOptions: guardrailProviderOptions,
  instructions: PROMPT_INJECTION_DETECTOR_INSTRUCTIONS,
});

// Types that would break this app's own data are deliberately left out of the
// defaults: `name` (commit authors), `url` (PR/issue links), `uuid`, and
// `date-of-birth`/`address` (never present in git logs, LLM-only and slow).
export const piiDetector = new PIIDetector({
  model: RELEASE_COPILOT_GUARDRAIL_MODEL,
  detectionTypes: [
    'email',
    'phone',
    'credit-card',
    'ssn',
    'api-key',
    'ip-address',
    'iban',
    'crypto-wallet',
  ],
  threshold: 0.6,
  strategy: 'redact',
  redactionMethod: 'placeholder',
  preserveFormat: true,
  lastMessageOnly: true,
  includeDetections: true,
  providerOptions: guardrailProviderOptions,
  instructions: PII_DETECTOR_INSTRUCTIONS,
});
