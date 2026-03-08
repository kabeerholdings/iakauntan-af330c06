import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import logoImg from '@/assets/logo.png';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('personal');
  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [companyPostcode, setCompanyPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Update profile with mobile & account type
      await supabase.from('profiles').update({
        mobile_no: mobileNo,
        account_type: accountType,
      }).eq('user_id', data.user.id);

      // Create company if company use
      if (accountType === 'company' && companyName) {
        await supabase.from('companies').insert({
          owner_id: data.user.id,
          name: companyName,
          registration_no: regNo || null,
          tax_id: taxId || null,
          address_line1: companyAddress || null,
          city: companyCity || null,
          state: companyState || null,
          postcode: companyPostcode || null,
        });
      }

      toast.success('Account created! Please check your email to verify.');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <img src={logoImg} alt="iAkauntan" className="h-10 w-10" />
            <span className="font-display text-2xl font-bold text-foreground">iAkauntan</span>
          </Link>
          <CardTitle className="font-display text-xl">Create Your Account</CardTitle>
          <CardDescription>
            {step === 1 ? 'Enter your personal details' : step === 2 ? 'Choose account type' : 'Enter company details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Ahmad" />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Ibrahim" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="regEmail">Email</Label>
                  <Input id="regEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="mobileNo">Mobile No</Label>
                  <Input id="mobileNo" type="tel" value={mobileNo} onChange={e => setMobileNo(e.target.value)} required placeholder="+60 12-345 6789" />
                </div>
                <div>
                  <Label htmlFor="regPassword">Password</Label>
                  <Input id="regPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Minimum 6 characters" minLength={6} />
                </div>
                <Button type="button" className="w-full" onClick={() => {
                  if (!firstName || !lastName || !email || !mobileNo || !password) {
                    toast.error('Please fill in all fields');
                    return;
                  }
                  setStep(2);
                }}>
                  Continue
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <RadioGroup value={accountType} onValueChange={setAccountType} className="space-y-3">
                  <div className="flex items-start gap-3 border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="personal" id="personal" />
                    <div>
                      <Label htmlFor="personal" className="text-base font-semibold cursor-pointer">Personal Use</Label>
                      <p className="text-sm text-muted-foreground">Track personal finances, freelance income & expenses</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="company" id="company" />
                    <div>
                      <Label htmlFor="company" className="text-base font-semibold cursor-pointer">Company / Business</Label>
                      <p className="text-sm text-muted-foreground">Full accounting suite with e-Invoice, GL, and reports</p>
                    </div>
                  </div>
                </RadioGroup>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button type={accountType === 'personal' ? 'submit' : 'button'} className="flex-1" disabled={loading}
                    onClick={() => { if (accountType === 'company') setStep(3); }}>
                    {accountType === 'personal' ? (loading ? 'Creating...' : 'Create Account') : 'Continue'}
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="ABC Sdn Bhd" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="regNo">Registration No (SSM)</Label>
                    <Input id="regNo" value={regNo} onChange={e => setRegNo(e.target.value)} placeholder="202301012345" />
                  </div>
                  <div>
                    <Label htmlFor="taxId">Tax ID (TIN)</Label>
                    <Input id="taxId" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="C12345678" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="companyAddress">Address</Label>
                  <Input id="companyAddress" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="123, Jalan Utama" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="companyCity">City</Label>
                    <Input id="companyCity" value={companyCity} onChange={e => setCompanyCity(e.target.value)} placeholder="KL" />
                  </div>
                  <div>
                    <Label htmlFor="companyState">State</Label>
                    <Input id="companyState" value={companyState} onChange={e => setCompanyState(e.target.value)} placeholder="W.P." />
                  </div>
                  <div>
                    <Label htmlFor="companyPostcode">Postcode</Label>
                    <Input id="companyPostcode" value={companyPostcode} onChange={e => setCompanyPostcode(e.target.value)} placeholder="50000" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </>
            )}
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
