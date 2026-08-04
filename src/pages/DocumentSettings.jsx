import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Save, FileText, Printer, Settings2, Eye } from 'lucide-react';
import { toast } from 'sonner';

const SECTIONS = [
  { key: 'paper', label: 'Paper & Layout' },
  { key: 'content', label: 'Content Options' },
  { key: 'typography', label: 'Typography & Style' },
  { key: 'modules', label: 'Module Defaults' },
];

const DEFAULTS = {
  paper_size: 'letter',
  orientation_default: 'portrait',
  margin_preset: 'normal',
  show_header: true,
  show_footer: true,
  show_logo: true,
  show_page_numbers: true,
  show_printed_date: true,
  header_style: 'full',
  font_family: 'system',
  table_density: 'normal',
  truck_pack_orientation: 'landscape',
  quote_show_signature: true,
  invoice_show_signature: false,
};

export default function DocumentSettings() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('paper');
  const [form, setForm] = useState(DEFAULTS);

  const { data: existingSettings = [] } = useQuery({
    queryKey: ['documentSettings'],
    queryFn: () => db.entities.DocumentSettings.list(),
  });

  const settingsRecord = existingSettings[0];

  useEffect(() => {
    if (settingsRecord) {
      setForm({ ...DEFAULTS, ...settingsRecord });
    }
  }, [settingsRecord]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (settingsRecord?.id) {
        return db.entities.DocumentSettings.update(settingsRecord.id, payload);
      }
      return db.entities.DocumentSettings.create(payload);
    },
    onSuccess: () => {
      toast.success('Document settings saved');
      queryClient.invalidateQueries({ queryKey: ['documentSettings'] });
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const Field = ({ label, description, children }) => (
    <div className="flex items-start justify-between py-4 border-b border-border last:border-0">
      <div className="flex-1 pr-8">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const Toggle = ({ field, label, description }) => (
    <Field label={label} description={description}>
      <Switch
        checked={!!form[field]}
        onCheckedChange={v => set(field, v)}
      />
    </Field>
  );

  const SelectField = ({ field, label, description, options }) => (
    <Field label={label} description={description}>
      <Select value={form[field] || ''} onValueChange={v => set(field, v)}>
        <SelectTrigger className="w-44 h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([val, lbl]) => (
            <SelectItem key={val} value={val}>{lbl}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Documents & PDF Settings</h1>
            <p className="text-sm text-muted-foreground">Controls all printed and exported documents across Port 24</p>
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground">
        <p className="font-semibold text-primary mb-1 flex items-center gap-2"><Printer className="w-4 h-4" /> Universal Print Engine</p>
        <p className="text-muted-foreground">These settings apply to all Port 24 documents — Quotes, Invoices, Picklists, Truck Packs, Crew Sheets, and Internal Reports. To suppress browser URL and timestamp in PDFs, use <strong>Save as PDF</strong> in the browser print dialog and uncheck "Headers and footers".</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`flex-1 text-xs font-medium px-3 py-2 rounded-md transition-all ${activeSection === s.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {activeSection === 'paper' && (
          <div className="divide-y divide-border px-6">
            <div className="py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paper & Layout</p>
            </div>
            <SelectField
              field="paper_size"
              label="Default Paper Size"
              description="Used for all documents unless overridden per-module"
              options={[['letter', 'US Letter (8.5" × 11")'], ['a4', 'A4 (210 × 297 mm)']]}
            />
            <SelectField
              field="orientation_default"
              label="Default Orientation"
              description="Portrait is used for most documents; Truck Pack defaults to landscape"
              options={[['portrait', 'Portrait'], ['landscape', 'Landscape']]}
            />
            <SelectField
              field="margin_preset"
              label="Page Margins"
              description="Narrow = 10mm, Normal = 14mm, Wide = 20mm"
              options={[['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide']]}
            />
          </div>
        )}

        {activeSection === 'content' && (
          <div className="divide-y divide-border px-6">
            <div className="py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content Options</p>
            </div>
            <Toggle field="show_header" label="Show Document Header" description="Brand header with logo and company name at top of each document" />
            <Toggle field="show_logo" label="Show Logo in Header" description="Requires logo to be set in Branding Settings" />
            <Toggle field="show_footer" label="Show Document Footer" description="Company contact info footer at bottom of each document" />
            <Toggle field="show_page_numbers" label="Show Page Numbers" description="Print page numbers in the document footer" />
            <Toggle field="show_printed_date" label="Show Printed Date" description="Show the date the document was generated" />
          </div>
        )}

        {activeSection === 'typography' && (
          <div className="divide-y divide-border px-6">
            <div className="py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Typography & Style</p>
            </div>
            <SelectField
              field="header_style"
              label="Header Style"
              description="Controls how prominent the brand header appears"
              options={[['full', 'Full — large header with logo'], ['compact', 'Compact — smaller header'], ['minimal', 'Minimal — no header']]}
            />
            <SelectField
              field="font_family"
              label="Document Font"
              description="Font used in all printed documents"
              options={[['system', 'System Default (Inter/Helvetica)'], ['inter', 'Inter'], ['georgia', 'Georgia (Serif)'], ['courier', 'Courier (Monospace)']]}
            />
            <SelectField
              field="table_density"
              label="Table Row Density"
              description="Controls spacing in line item tables"
              options={[['compact', 'Compact'], ['normal', 'Normal'], ['relaxed', 'Relaxed']]}
            />
          </div>
        )}

        {activeSection === 'modules' && (
          <div className="divide-y divide-border px-6">
            <div className="py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Module Defaults</p>
            </div>
            <SelectField
              field="truck_pack_orientation"
              label="Truck Pack Orientation"
              description="Truck packs are usually wider than tall"
              options={[['landscape', 'Landscape (recommended)'], ['portrait', 'Portrait']]}
            />
            <Toggle field="quote_show_signature" label="Show Signature Block on Quotes" description="Adds a client approval signature line at the bottom of quotes" />
            <Toggle field="invoice_show_signature" label="Show Signature Block on Invoices" description="Adds a payment authorization signature line" />
          </div>
        )}
      </div>

      {/* Document checklist */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" /> Documents Using This Engine
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            'Quotes', 'Invoices', 'Picklists', 'Master Pick Lists',
            'Truck Packs', 'Pull Sheets', 'Crew Sheets', 'Gear Lists', 'Project Reports',
          ].map(doc => (
            <div key={doc} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {doc}
            </div>
          ))}
        </div>
      </div>

      {/* PDF tip */}
      <div className="bg-muted/20 border border-border rounded-lg p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-sm">Getting Clean PDFs (No Browser URL/Timestamp)</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click <strong>Export PDF</strong> or <strong>Print PDF</strong> on any document</li>
          <li>In the browser print dialog, set <strong>Destination</strong> to "Save as PDF"</li>
          <li>Open <strong>More settings</strong> and uncheck <strong>"Headers and footers"</strong></li>
          <li>Set margins to <strong>None</strong> (our documents handle their own margins)</li>
          <li>Click <strong>Save</strong></li>
        </ol>
      </div>
    </div>
  );
}