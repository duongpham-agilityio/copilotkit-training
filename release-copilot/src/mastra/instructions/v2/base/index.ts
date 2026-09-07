import { TONE_AND_LANGUAGE } from './reply-language';
import { SECURITY } from './security';
import { ASK_BEFORE_GUESSING } from './ask-before-guessing';

export const BASE_INSTRUCTIONS: readonly string[] = [
  TONE_AND_LANGUAGE,
  SECURITY,
  ASK_BEFORE_GUESSING,
];
