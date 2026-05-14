// Persona service. Today returns the three demo personas by id; once we wire
// real auth + advisor profiles the signature stays the same and the
// implementation switches on DEMO_MODE.

import { PERSONAS } from '@/data/demoData';
import type { Persona, PersonaId } from '@/types/demo';
import { DEMO_MODE } from './config';

export const personasService = {
  list(): Persona[] {
    if (!DEMO_MODE) throw new Error('personasService.list: live mode not implemented');
    return Object.values(PERSONAS);
  },

  get(id: PersonaId): Persona | null {
    if (!DEMO_MODE) throw new Error('personasService.get: live mode not implemented');
    return PERSONAS[id] ?? null;
  },
};
