import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Twitter, Linkedin, Github } from 'lucide-react';

export const CTA: React.FC = () => {
    return (
        <section className="py-24 px-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-primary/20 blur-[120px] rounded-full -z-10" />

            <div className="max-w-5xl mx-auto glass p-12 md:p-20 rounded-[40px] text-center border-white/10 relative overflow-hidden group">
                <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[80px] rounded-full transition-all duration-1000 group-hover:scale-125" />

                <motion.h2
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-5xl font-black mb-6"
                >
                    Ready to take control <br /> of your <span className="text-gradient">risks?</span>
                </motion.h2>
                <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto leading-relaxed">
                    Join 500+ enterprises automating their risk assessment workflow with SWOT Risk.
                    Get started for free today.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <button className="btn-primary py-4 px-8 text-lg w-full md:w-auto flex items-center justify-center gap-2">
                        Get Started for Free <ArrowRight className="w-5 h-5" />
                    </button>
                    <button className="btn-secondary py-4 px-8 text-lg w-full md:w-auto">
                        Book a Demo
                    </button>
                </div>
            </div>
        </section>
    );
};

export const Footer: React.FC = () => {
    return (
        <footer id="contact" className="pt-24 pb-12 px-6 border-t border-white/5">
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                {/* Brand */}
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-secondary">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">SWOT Risk</span>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed mb-6">
                        The world's first AI-native risk intelligence platform. Secure your future with automated clarity.
                    </p>
                    <div className="flex items-center gap-4">
                        <a href="#" className="p-2 rounded-lg glass text-white/50 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
                        <a href="#" className="p-2 rounded-lg glass text-white/50 hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
                        <a href="#" className="p-2 rounded-lg glass text-white/50 hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
                    </div>
                </div>

                {/* Links */}
                <div>
                    <h4 className="font-bold mb-6 text-white">Product</h4>
                    <ul className="space-y-4 text-sm text-white/50">
                        <li><a href="#" className="hover:text-primary transition-colors">Excel Import</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">AI Analysis</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Risk Scoring</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Heatmaps</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-6 text-white">Company</h4>
                    <ul className="space-y-4 text-sm text-white/50">
                        <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-bold mb-6 text-white">Legal</h4>
                    <ul className="space-y-4 text-sm text-white/50">
                        <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
                        <li><a href="#" className="hover:text-primary transition-colors">Ethics</a></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-white/30 uppercase tracking-widest">
                <span>© 2026 SWOT Risk Technologies Inc. All rights reserved.</span>
                <span>Built with AI for modern enterprises</span>
            </div>
        </footer>
    );
};
