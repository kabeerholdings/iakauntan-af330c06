import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Image, Mail, Globe, Save, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

type WhiteLabelSettings = {
  id: string;
  brand_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_css: string | null;
  hide_powered_by: boolean;
  custom_domain: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
};

const WhiteLabelPage = () => {
  const { selectedCompany } = useCompany();
  const [settings, setSettings] = useState<WhiteLabelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brand_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#6366f1',
    accent_color: '#f59e0b',
    custom_css: '',
    hide_powered_by: false,
    custom_domain: '',
    email_from_name: '',
    email_from_address: '',
  });

  useEffect(() => { if (selectedCompany) fetchSettings(); }, [selectedCompany]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('white_label_settings').select('*').eq('company_id', selectedCompany!.id).single();
    if (data) {
      setSettings(data);
      setForm({
        brand_name: data.brand_name || '',
        logo_url: data.logo_url || '',
        favicon_url: data.favicon_url || '',
        primary_color: data.primary_color || '#3b82f6',
        secondary_color: data.secondary_color || '#6366f1',
        accent_color: data.accent_color || '#f59e0b',
        custom_css: data.custom_css || '',
        hide_powered_by: data.hide_powered_by || false,
        custom_domain: data.custom_domain || '',
        email_from_name: data.email_from_name || '',
        email_from_address: data.email_from_address || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      company_id: selectedCompany!.id,
      brand_name: form.brand_name || null,
      logo_url: form.logo_url || null,
      favicon_url: form.favicon_url || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      accent_color: form.accent_color,
      custom_css: form.custom_css || null,
      hide_powered_by: form.hide_powered_by,
      custom_domain: form.custom_domain || null,
      email_from_name: form.email_from_name || null,
      email_from_address: form.email_from_address || null,
    };
    
    const { error } = settings
      ? await supabase.from('white_label_settings').update(payload).eq('id', settings.id)
      : await supabase.from('white_label_settings').insert(payload);
    
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Settings saved');
    fetchSettings();
  };

  if (loading) return <p className="text-muted-foreground p-6">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-display font-bold text-foreground">White Label</h1><p className="text-muted-foreground">Customize branding and appearance</p></div>
        <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding"><Image className="h-4 w-4 mr-1" />Branding</TabsTrigger>
          <TabsTrigger value="colors"><Palette className="h-4 w-4 mr-1" />Colors</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1" />Email</TabsTrigger>
          <TabsTrigger value="domain"><Globe className="h-4 w-4 mr-1" />Domain</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <Card>
            <CardHeader><CardTitle>Brand Identity</CardTitle><CardDescription>Customize your brand name and logos</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Brand Name</Label><Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} placeholder="Your Company Name" /></div>
              <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://example.com/logo.png" /></div>
              <div><Label>Favicon URL</Label><Input value={form.favicon_url} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} placeholder="https://example.com/favicon.ico" /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.hide_powered_by} onCheckedChange={(c) => setForm({ ...form, hide_powered_by: c })} />
                <Label>Hide "Powered by" branding</Label>
              </div>
              {form.logo_url && (
                <div className="border rounded-lg p-4"><Label className="mb-2 block">Preview</Label><img src={form.logo_url} alt="Logo preview" className="max-h-16 object-contain" /></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader><CardTitle>Color Scheme</CardTitle><CardDescription>Customize your brand colors</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Primary Color</Label><div className="flex gap-2"><Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-16 h-10 p-1" /><Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div></div>
                <div><Label>Secondary Color</Label><div className="flex gap-2"><Input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="w-16 h-10 p-1" /><Input value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} /></div></div>
                <div><Label>Accent Color</Label><div className="flex gap-2"><Input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="w-16 h-10 p-1" /><Input value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} /></div></div>
              </div>
              <div><Label>Custom CSS</Label><Textarea rows={6} value={form.custom_css} onChange={(e) => setForm({ ...form, custom_css: e.target.value })} placeholder="/* Add custom CSS here */" className="font-mono text-sm" /></div>
              <div className="border rounded-lg p-4">
                <Label className="mb-2 block">Color Preview</Label>
                <div className="flex gap-2">
                  <div className="w-16 h-16 rounded" style={{ backgroundColor: form.primary_color }}><span className="text-xs text-white p-1">Primary</span></div>
                  <div className="w-16 h-16 rounded" style={{ backgroundColor: form.secondary_color }}><span className="text-xs text-white p-1">Secondary</span></div>
                  <div className="w-16 h-16 rounded" style={{ backgroundColor: form.accent_color }}><span className="text-xs text-white p-1">Accent</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader><CardTitle>Email Settings</CardTitle><CardDescription>Customize email sender information</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>From Name</Label><Input value={form.email_from_name} onChange={(e) => setForm({ ...form, email_from_name: e.target.value })} placeholder="Your Company" /></div>
              <div><Label>From Email Address</Label><Input type="email" value={form.email_from_address} onChange={(e) => setForm({ ...form, email_from_address: e.target.value })} placeholder="noreply@yourcompany.com" /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain">
          <Card>
            <CardHeader><CardTitle>Custom Domain</CardTitle><CardDescription>Use your own domain for the application</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Custom Domain</Label><Input value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} placeholder="app.yourcompany.com" /></div>
              <p className="text-sm text-muted-foreground">Note: Custom domain requires DNS configuration. Contact support for setup instructions.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhiteLabelPage;
