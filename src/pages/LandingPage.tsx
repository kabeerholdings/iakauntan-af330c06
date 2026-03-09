import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, Shield, Globe, CheckCircle2 } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import heroImg from '@/assets/hero-illustration.png';

const features = [
  { icon: FileText, title: 'Invoicing & Billing', desc: 'Create professional invoices, track payments, manage receivables with ease.' },
  { icon: Globe, title: 'Malaysian e-Invoice', desc: 'LHDN-compliant e-Invoice generation and submission built right in.' },
  { icon: BarChart3, title: 'Financial Reports', desc: 'Trial balance, P&L, balance sheet — all auto-generated from your entries.' },
  { icon: Shield, title: 'Multi-Company', desc: 'Manage multiple businesses from a single dashboard with separate books.' },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="iAkauntan" className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="font-display text-lg sm:text-xl font-bold text-foreground">iAkauntan</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
              <Link to="/login">Log In</Link>
            </Button>
            <Button variant="hero" size="sm" asChild className="text-xs sm:text-sm">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 gradient-hero relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-6">
                Cloud Accounting
                <span className="block text-accent">Made Simple</span>
              </h1>
              <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg">
                Full-featured multi-company accounting with Malaysian e-Invoice (LHDN) support. 
                Manage your finances from anywhere.
              </p>
              <div className="flex gap-4">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/register">Start Free Trial</Link>
                </Button>
                <Button variant="hero-outline" size="lg" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                {['SST Ready', 'LHDN e-Invoice', 'Multi-Currency', 'Bank Reconciliation'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-primary-foreground/60 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:block"
            >
              <img src={heroImg} alt="iAkauntan Dashboard" className="w-full max-w-lg mx-auto drop-shadow-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete accounting suite designed for Malaysian businesses of all sizes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow border border-border"
              >
                <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-primary">
        <div className="container mx-auto px-6 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of Malaysian businesses managing their accounts with iAkauntan.
          </p>
          <Button variant="hero-outline" size="lg" asChild>
            <Link to="/register">Create Your Free Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-foreground">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="iAkauntan" className="h-6 w-6" />
            <span className="font-display font-semibold text-background">iAkauntan.com</span>
          </div>
          <p className="text-background/50 text-sm">© 2026 iAkauntan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
