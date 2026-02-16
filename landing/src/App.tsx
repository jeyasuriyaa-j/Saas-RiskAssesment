import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Problem from './components/Problem';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import ProductPreview from './components/ProductPreview';
import ValueProposition from './components/ValueProposition';
import Outcomes from './components/Outcomes';
import Benefits from './components/Benefits';
import Pricing from './components/Pricing';
import { CTA, Footer } from './components/Footer';

function App() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background text-white overflow-x-hidden selection:bg-primary/30">
            {/* Background Glow Mesh */}
            <div className="glow-mesh" aria-hidden="true" />

            <Navbar scrolled={scrolled} />

            <main>
                <Hero />
                <Problem />
                <Features />
                <HowItWorks />
                <ProductPreview />
                <ValueProposition />
                <Outcomes />
                <Benefits />
                <Pricing />
                <CTA />
            </main>

            <Footer />
        </div>
    );
}

export default App;
