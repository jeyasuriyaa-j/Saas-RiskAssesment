import React from 'react';
import { Play, ArrowRight, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const Hero: React.FC = () => {
    return (
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-hero-glow opacity-60 pointer-events-none" />

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
                {/* Left Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col gap-6"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border-primary/20 text-primary-light text-xs font-bold uppercase tracking-wider w-fit">
                        <Zap className="w-3 h-3 fill-current" />
                        <span>Next-Gen Risk Management</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                        Transform Spreadsheet Chaos into <span className="text-gradient">AI-Powered Risk Intelligence</span>
                    </h1>

                    <p className="text-lg text-white/60 max-w-xl leading-relaxed">
                        Upload your messy risk registers. Our AI maps data, authors audit-ready statements, and correlates risks automatically. Move from manual guesswork to strategic clarity.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-4">
                        <button className="btn-primary flex items-center gap-2">
                            Start Free Trial <ArrowRight className="w-4 h-4" />
                        </button>
                        <button className="btn-secondary flex items-center gap-2">
                            <Play className="w-4 h-4 fill-current" /> Watch Demo
                        </button>
                    </div>

                    {/* Trust Badges */}
                    <div className="mt-8 pt-8 border-t border-white/5 flex flex-wrap gap-8 items-center opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter"><BarChart3 className="w-6 h-6" /> DATACORE</div>
                        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter"><ShieldCheck className="w-6 h-6" /> SECURE-IT</div>
                        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">CLOUDGUARD</div>
                    </div>
                </motion.div>

                {/* Right Content - Mockup */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative glass rounded-2xl overflow-hidden shadow-2xl">
                        {/* Toolbar Decor */}
                        <div className="bg-white/5 h-8 flex items-center px-4 gap-1.5 border-b border-white/5">
                            <div className="w-2.5 h-2.5 rounded-full bg-error/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-warning/50" />
                            <div className="w-2.5 h-2.5 rounded-full bg-success/50" />
                        </div>

                        {/* The actual mockup image */}
                        <img
                            src="/hero_dashboard_mockup.png"
                            alt="SWOT Risk Dashboard Mockup"
                            className="w-full object-cover"
                        />

                        {/* Floating Glass Cards Overlay */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/2 -left-6 glass p-4 rounded-xl shadow-xl hidden md:block"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                                    <ShieldCheck className="w-6 h-6 text-success" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-white/40 uppercase font-bold">Risk Status</div>
                                    <div className="text-sm font-bold text-success">Mitigated</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
