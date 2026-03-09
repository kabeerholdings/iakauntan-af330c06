import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Shield, Smartphone, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const TwoFactorPage = () => {
  const [enabled, setEnabled] = useState(false);
  const [method, setMethod] = useState<'app' | 'sms' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'setup' | 'verify' | 'done'>('setup');

  const handleEnable = (selectedMethod: 'app' | 'sms') => {
    setMethod(selectedMethod);
    setStep('verify');
  };

  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    // Simulate verification
    setEnabled(true);
    setStep('done');
    toast.success('Two-factor authentication enabled');
  };

  const handleDisable = () => {
    setEnabled(false);
    setMethod(null);
    setStep('setup');
    toast.success('Two-factor authentication disabled');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Two-Factor Authentication</h1>
        <p className="text-muted-foreground">Add an extra layer of security to your account</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>2FA Status</CardTitle>
                <CardDescription>Protect your account with two-factor authentication</CardDescription>
              </div>
            </div>
            <Badge variant={enabled ? 'default' : 'secondary'} className="text-sm">
              {enabled ? <><CheckCircle2 className="h-3 w-3 mr-1" />Enabled</> : <><AlertTriangle className="h-3 w-3 mr-1" />Disabled</>}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {enabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Two-factor authentication is enabled</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Method: {method === 'app' ? 'Authenticator App' : 'SMS'}</p>
                </div>
              </div>
              <Button variant="destructive" onClick={handleDisable}>Disable 2FA</Button>
            </div>
          ) : step === 'setup' ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Choose your preferred method for receiving verification codes:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleEnable('app')}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Smartphone className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">Authenticator App</p>
                        <p className="text-sm text-muted-foreground">Use Google Authenticator, Authy, or similar apps</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleEnable('sms')}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <Key className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-medium">SMS Verification</p>
                        <p className="text-sm text-muted-foreground">Receive codes via text message</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : step === 'verify' && (
            <div className="space-y-4">
              {method === 'app' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">Scan the QR code below with your authenticator app:</p>
                  <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
                    <div className="w-48 h-48 bg-muted flex items-center justify-center text-muted-foreground">
                      [QR Code Placeholder]
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">Or enter this code manually: <code className="bg-muted px-2 py-1 rounded">ABCD EFGH IJKL MNOP</code></p>
                </div>
              )}
              {method === 'sms' && (
                <p className="text-muted-foreground">A verification code has been sent to your registered phone number.</p>
              )}
              <div className="max-w-xs">
                <Label>Enter verification code</Label>
                <Input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="text-center text-2xl tracking-widest" maxLength={6} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleVerify}>Verify & Enable</Button>
                <Button variant="outline" onClick={() => { setStep('setup'); setMethod(null); }}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recovery Options</CardTitle><CardDescription>Backup methods to access your account if you lose your device</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Recovery Codes</p>
              <p className="text-sm text-muted-foreground">One-time use codes for emergency access</p>
            </div>
            <Button variant="outline" disabled={!enabled}>Generate Codes</Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Backup Phone Number</p>
              <p className="text-sm text-muted-foreground">Add a secondary phone for SMS verification</p>
            </div>
            <Button variant="outline" disabled={!enabled}>Add Number</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security Recommendations</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />Use a strong, unique password for your account</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />Enable two-factor authentication for all users</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />Store recovery codes in a secure location</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />Review active sessions regularly</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TwoFactorPage;
