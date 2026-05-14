import { personasService } from '@/services';
import { usePersona } from '@/stores/personaStore';
import { cn } from '@/lib/utils';

export function PersonaSwitcher() {
  const { personaId, setPersonaId } = usePersona();
  const personas = personasService.list();

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-1">
      {personas.map((p) => {
        const active = p.id === personaId;
        return (
          <button
            key={p.id}
            onClick={() => setPersonaId(p.id)}
            className={cn(
              'rounded-sm px-3 py-2 text-left text-sm transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted',
            )}
          >
            <div className="font-medium leading-tight">{p.label}</div>
            <div className={cn('text-xs leading-tight', active ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
              {p.advisorName}
            </div>
          </button>
        );
      })}
    </div>
  );
}
