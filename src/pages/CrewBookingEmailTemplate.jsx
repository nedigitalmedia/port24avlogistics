import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import { Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

const PLACEHOLDERS = [
  { key: '{{crew_name}}', desc: 'Crew member name' },
  { key: '{{crew_email}}', desc: 'Crew member email' },
  { key: '{{show_name}}', desc: 'Show/event name' },
  { key: '{{start_date}}', desc: 'Start date' },
  { key: '{{end_date}}', desc: 'End date' },
  { key: '{{rate}}', desc: 'Offered rate' },
  { key: '{{accommodation}}', desc: 'Accommodation details' },
  { key: '{{company_name}}', desc: 'Your company name' },
  { key: '{{company_logo_url}}', desc: 'Your company logo URL' },
  { key: '{{company_phone}}', desc: 'Your company phone' },
  { key: '{{company_email}}', desc: 'Your company email' },
];

export default function CrewBookingEmailTemplate() {
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    body: '',
    is_default: true,
  });

  const queryClient = useQueryClient();

  // Fetch template
  const { data: templates } = useQuery({
    queryKey: ['crewBookingEmailTemplate'],
    queryFn: () => db.entities.CrewBookingEmailTemplate.list(),
  });

  const template = templates?.[0];

  // Load template on fetch
  useEffect(() => {
    if (template) {
      setForm({
        subject: template.subject || '',
        body: template.body || '',
        is_default: template.is_default !== false,
      });
    }
  }, [template]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (template) {
        return db.entities.CrewBookingEmailTemplate.update(template.id, data);
      } else {
        return db.entities.CrewBookingEmailTemplate.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crewBookingEmailTemplate'] });
      toast.success('Template saved');
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const handleSave = () => {
    if (!form.subject.trim() || !form.body.trim()) {
      alert('Subject and body are required');
      return;
    }
    saveMutation.mutate(form);
  };

  // Sample data for preview
  const sampleData = {
    crew_name: 'John Smith',
    crew_email: 'john@example.com',
    show_name: 'Corporate Event 2026',
    start_date: '2026-04-15',
    end_date: '2026-04-17',
    rate: '$500/day',
    accommodation: 'Hotel provided',
    company_name: 'AV Productions',
    company_logo_url: 'https://via.placeholder.com/200x50',
    company_phone: '+1-555-0123',
    company_email: 'bookings@avprod.com',
  };

  const renderPreview = (html) => {
    let preview = html;
    PLACEHOLDERS.forEach(({ key }) => {
      const dataKey = key.replace(/[{}]/g, '');
      preview = preview.replace(new RegExp(key, 'g'), sampleData[dataKey] || key);
    });
    return preview;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Crew Booking Email Template"
        description="Design the email invitation sent to crew members when they're booked for a show"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g., You're invited to {{show_name}}"
                className="mb-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Body (HTML)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Enter HTML email content with {{placeholders}}"
                className="font-mono text-sm h-96"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Template'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Placeholders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {PLACEHOLDERS.map(({ key, desc }) => (
                  <div
                    key={key}
                    className="p-2 bg-slate-100 rounded cursor-pointer hover:bg-slate-200 transition-colors"
                    onClick={() => {
                      setForm({
                        ...form,
                        body: form.body + key,
                      });
                    }}
                  >
                    <code className="font-mono text-xs text-primary">{key}</code>
                    <p className="text-muted-foreground text-xs">{desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview (Sample Data)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white p-6 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Subject:</strong> {renderPreview(form.subject)}
              </p>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderPreview(form.body)) }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}