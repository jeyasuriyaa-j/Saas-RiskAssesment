import React from 'react';
import { Shield, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavbarProps {
    scrolled: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ scrolled }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const navLinks = [
        { name: 'Product', href: '#product' },
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Contact', href: '#contact' },
    ];

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
            scrolled ? "bg-background/80 backdrop-blur-lg border-b border-enterprise-border py-3" : "bg-transparent"
        )}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary group-hover:shadow-[0_0_15px_rgba(139,92,246,0.6)] transition-all">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">SWOT <span className="text-primary-light">Risk</span></span>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            {link.name}
                        </a>
                    ))}
                </div>

                {/* Desktop CTAs */}
                <div className="hidden md:flex items-center gap-4">
                    <button className="text-sm font-semibold hover:text-primary-light transition-colors">
                        Login
                    </button>
                    <button className="btn-primary py-2 px-5 text-sm">
                        Start Free Trial
                    </button>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden p-2 text-white"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 glass backdrop-blur-xl p-6 flex flex-col gap-4 animate-fade-in">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className="text-lg font-medium border-b border-white/5 pb-2"
                            onClick={() => setIsOpen(false)}
                        >
                            {link.name}
                        </a>
                    ))}
                    <div className="flex flex-col gap-3 mt-4">
                        <button className="btn-secondary w-full">Login</button>
                        <button className="btn-primary w-full">Start Free Trial</button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
