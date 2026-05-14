import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePersona } from '@/stores/personaStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const items = [
  { to: '/', label: 'Today', end: true },
  { to: '/overview', label: 'Overview', end: false },
  { to: '/explore', label: 'Explore', end: false },
];

export function TopNav() {
  const { resetDemo } = usePersona();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    resetDemo();
    setOpen(false);
    navigate('/');
  };

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-30">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-8 h-12 flex items-center gap-1">
        <div className="font-semibold text-foreground tracking-tight mr-6">Prism</div>
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              cn(
                'px-3 h-9 inline-flex items-center text-sm rounded-md transition-colors',
                isActive
                  ? 'text-foreground font-medium bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )
            }
          >
            {it.label}
          </NavLink>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="ml-auto text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-2 h-9 inline-flex items-center"
          title="Reset demo to clean state for the next booth visitor"
        >
          Reset demo
        </button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset demo to clean state?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all toggles, filters, and progress. Use this between booth
              visitors to give everyone a fresh experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Reset demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
