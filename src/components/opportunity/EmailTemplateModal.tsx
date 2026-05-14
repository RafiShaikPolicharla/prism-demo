import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { EmailTemplate } from '@/types/demo';

export interface TemplateVars {
  firstName?: string;
  spouseName?: string;
  advisorName?: string;
  priorAdvisorName?: string;
  babyName?: string;
  weekDate?: string;
}

interface EmailTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  vars?: TemplateVars;
}

function substitute(text: string, vars: TemplateVars): string {
  return text
    .replace(/\{\{firstName\}\}/g, vars.firstName ?? '')
    .replace(/\{\{spouseName\}\}/g, vars.spouseName ?? 'your spouse')
    .replace(/\{\{advisorName\}\}/g, vars.advisorName ?? '')
    .replace(/\{\{priorAdvisorName\}\}/g, vars.priorAdvisorName ?? 'Robert Bell')
    .replace(/\{\{babyName\}\}/g, vars.babyName ?? 'the baby')
    .replace(/\{\{weekDate\}\}/g, vars.weekDate ?? '');
}

export function EmailTemplateModal({
  open,
  onOpenChange,
  template,
  vars = {},
}: EmailTemplateModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  const initial = useMemo(() => {
    if (!template) return { subject: '', body: '' };
    return {
      subject: substitute(template.subject, vars),
      body: substitute(template.body, vars),
    };
  }, [template, vars]);

  useEffect(() => {
    if (open) {
      setSubject(initial.subject);
      setBody(initial.body);
      setCopied(false);
    }
  }, [open, initial]);

  if (!template) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSend = () => {
    toast.success('Email drafted in Outlook');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-subject" className="text-xs uppercase tracking-wider text-muted-foreground">
              Subject
            </Label>
            <Input
              id="tpl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body" className="text-xs uppercase tracking-wider text-muted-foreground">
              Body
            </Label>
            <Textarea
              id="tpl-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="font-mono text-sm leading-relaxed"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy to clipboard'}
          </Button>
          <Button onClick={handleSend}>
            <Send className="h-4 w-4" />
            Send to Outlook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
