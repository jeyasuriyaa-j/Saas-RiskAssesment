import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Cpu, CheckCircle } from 'lucide-react';

const steps = [
    {
        icon: <Upload className="w-10 h-10" />,
        title: "1. Ingest",
        description: "Upload Excel/CSV risk registers. Our AI handles column mapping, normalization, and deduplication automatically.",
        color: "from-blue-500 to-cyan-400"
    },
    {
        icon: <Cpu className="w-10 h-10" />,
        title: "2. Analyze",
        description: "Our VLP engine authors audit-ready statements and suggests scores based on your organizational context.",
        color: "from-purple-500 to-pink-400"
    },
    {
        icon: <CheckCircle className="w-10 h-10" />,
        title: "3. Act",
        description: "Visualize correlations across business units, generate stakeholder briefs, and track remediation in real-time.",
        color: "from-emerald-500 to-teal-400"
    }
];

const HowItWorks: React.FC = () => {
    return (
        <section id="how-it-works" className="py-24 px-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10 hidden lg:block" />

            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-bold mb-4"
                    >
                        How It <span className="text-gradient">Works</span>
                    </motion.h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        Our streamlined workflow moves you from spreadsheet chaos to automated control in minutes.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-12 relative">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                            className="relative flex flex-col items-center text-center"
                        >
                            {/* Step Icon with Glow */}
                            <div className={`mb-8 p-6 rounded-3xl bg-gradient-to-br ${step.color} shadow-[0_0_30px_rgba(0,0,0,0.5)] relative group`}>
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity rounded-3xl" />
                                <div className="text-white relative z-10">
                                    {step.icon}
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                            <p className="text-white/50 leading-relaxed max-w-xs">
                                {step.description}
                            </p>

                            {/* Connecting Line for Mobile (hidden on LG) */}
                            {index < steps.length - 1 && (
                                <div className="lg:hidden w-[2px] h-12 bg-white/10 my-6" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
