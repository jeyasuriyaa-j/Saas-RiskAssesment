import React from 'react';
import { motion } from 'framer-motion';
import { MousePointer2, Layers, ShieldCheck } from 'lucide-react';

const ProductPreview: React.FC = () => {
    return (
        <section id="product" className="py-24 px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-bold mb-4"
                    >
                        Experience the <span className="text-gradient">Next-Gen Interface</span>
                    </motion.h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        Powerful features delivered through a clean, intuitive dashboard designed for speed and clarity.
                    </p>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 items-center">
                    {/* Main Screenshot Area */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-8 relative group"
                    >
                        <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500" />
                        <div className="relative glass rounded-2xl overflow-hidden border-white/10">
                            <img
                                src="/hero_dashboard_mockup.png"
                                alt="Product Interface"
                                className="w-full h-auto"
                            />
                        </div>
                    </motion.div>

                    {/* Feature Highlights */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="glass p-6 rounded-2xl border-white/5 hover:border-primary/30 transition-all cursor-default"
                        >
                            <div className="flex items-center gap-4 mb-3 text-primary-light">
                                <MousePointer2 className="w-5 h-5" />
                                <h4 className="font-bold">Interactive Analysis</h4>
                            </div>
                            <p className="text-sm text-white/50 leading-relaxed">
                                Review AI suggestions with intuitive hover interactions and instant validation feedback.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="glass p-6 rounded-2xl border-white/5 hover:border-accent/30 transition-all cursor-default"
                        >
                            <div className="flex items-center gap-4 mb-3 text-accent">
                                <Layers className="w-5 h-5" />
                                <h4 className="font-bold">Layered Security</h4>
                            </div>
                            <p className="text-sm text-white/50 leading-relaxed">
                                Connect risks to controls, departments, and strategic objectives for deep context.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="glass p-6 rounded-2xl border-white/5 hover:border-success/30 transition-all cursor-default"
                        >
                            <div className="flex items-center gap-4 mb-3 text-success">
                                <ShieldCheck className="w-5 h-5" />
                                <h4 className="font-bold">Policy Alignment</h4>
                            </div>
                            <p className="text-sm text-white/50 leading-relaxed">
                                Automatically verify compliance with internal policies and global security standards.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProductPreview;
