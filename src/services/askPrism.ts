// Ask Prism service — wraps the keyword matcher in demoData. In live mode
// this routes through an edge function that calls the LLM gateway with
// rule + content context.

import {
  ASK_PRISM_QUESTIONS,
  ASK_PRISM_FALLBACK,
  findAskPrismMatch,
} from '@/data/demoData';
import type { AskPrismQuestion, AskPrismFallback } from '@/types/demo';
import { DEMO_MODE } from './config';

export const askPrismService = {
  match(userInput: string): AskPrismQuestion | null {
    if (!DEMO_MODE) throw new Error('askPrismService.match: live mode not implemented');
    return findAskPrismMatch(userInput);
  },

  fallback(): AskPrismFallback {
    if (!DEMO_MODE) throw new Error('askPrismService.fallback: live mode not implemented');
    return ASK_PRISM_FALLBACK;
  },

  examples(): AskPrismQuestion[] {
    if (!DEMO_MODE) throw new Error('askPrismService.examples: live mode not implemented');
    return ASK_PRISM_QUESTIONS;
  },
};
