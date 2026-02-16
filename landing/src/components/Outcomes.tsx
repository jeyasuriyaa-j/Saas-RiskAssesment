import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const Outcomes: React.FC = () => {
    const outcomes = [
        {
            tier: "TIER 1",
            title: "Risk Transformation & Accuracy",
            categories: [
                {
                    name: "Accelerated Migration",
                    description: "Move from siloed spreadsheets to AI-governed registers in minutes.",
                    stats: [
                        "90% faster migration from Excel",
                        "Automatic duplicate detection",
                        "100% data mapping accuracy"
                    ]
                },
                {
                    name: "Intelligent Triage",
                    description: "AI-guided scoring that learns from your organization's risk history.",
                    stats: [
                        "45% better scoring consistency",
                        "Zero manual entry errors",
                        "Real-time outlier detection"
                    ]
                },
                {
                    name: "Audit Readiness",
                    description: "Maintain a living, breathing risk register that is always ready for review.",
                    stats: [
                        "80% reduction in audit prep",
                        "Full immutable change logs",
                        "1-click compliance heatmaps"
                    ]
                }
            ]
        }
    ];

    return (
        <section className="py-24 px-6 bg-white/[0.01]">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl font-bold mb-4"
                    >
                        Strategic Business <span className="text-gradient">Outcomes</span>
                    </motion.h2>
                </div>

                <div className="space-y-16">
                    {outcomes.map((tier, idx) => (
                        <div key={idx} className="space-y-8">
                            <div className="flex items-center gap-4 text-indigo-400">
                                <div className="p-2 rounded-full border border-indigo-500/30">
                                    <div className="w-5 h-5 rounded-sm border-2 border-current flex items-center justify-center font-bold text-[10px]">1</div>
                                </div>
                                <h3 className="text-xl font-bold tracking-tight uppercase">
                                    {tier.tier} <span className="text-white ml-2">{tier.title}</span>
                                </h3>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                {tier.categories.map((cat, cIdx) => (
                                    <motion.div
                                        key={cIdx}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: cIdx * 0.1 }}
                                        className="glass p-8 rounded-2xl border-white/5 flex flex-col gap-6"
                                    >
                                        <div>
                                            <h4 className="text-lg font-bold text-indigo-300 mb-2">{cat.name}</h4>
                                            <p className="text-sm text-white/50 leading-relaxed">{cat.description}</p>
                                        </div>

                                        <div className="space-y-3">
                                            {cat.stats.map((stat, sIdx) => (
                                                <div key={sIdx} className="flex gap-3 items-start p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                                                    <div className="w-1.5 h-6 bg-green-500 rounded-full mt-1 shrink-0" />
                                                    <span className="text-xs font-medium text-white/80">{stat}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Outcomes;
