import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, TrendingUp, DollarSign, BarChart3, Users, Cpu } from 'lucide-react';

interface Metric {
    label: string;
    value: string;
}

interface Subsection {
    title: string;
    description: string;
    metrics: Metric[];
}

interface Tier {
    id: string;
    name: string;
    title: string;
    description: string;
    color: string;
    icon: JSX.Element;
    subsections: Subsection[];
}

const ValueProposition: React.FC = () => {
    const tiers: Tier[] = [
        {
            id: "tier1",
            name: "TIER 1",
            title: "Risk Intelligence",
            description: "Replace manual guesswork with AI-driven clarity and precision authoring.",
            color: "from-blue-600 to-cyan-500",
            icon: <Shield className="w-6 h-6 text-white" />,
            subsections: [
                {
                    title: "AI Authoring Assistant",
                    description: "Normalize vague risks into audit-ready cause-event-impact statements.",
                    metrics: [
                        { label: "Confidence Score", value: "98%" },
                        { label: "Drafting Speed", value: "10x Faster" }
                    ]
                },
                {
                    title: "AI Triage & Scoring",
                    description: "Get smart suggestions for likelihood and impact based on context.",
                    metrics: [
                        { label: "Scoring Consistency", value: "+45%" },
                        { label: "Decision Cycle", value: "-60%" }
                    ]
                }
            ]
        },
        {
            id: "tier2",
            name: "TIER 2",
            title: "Operational Efficiency",
            description: "Automate the heavy lifting of risk management so you can focus on mitigation.",
            color: "from-purple-600 to-pink-500",
            icon: <Cpu className="w-6 h-6 text-white" />,
            subsections: [
                {
                    title: "Excel Auto-Mapping",
                    description: "Migrate hundreds of risks in seconds with intelligent column parsing.",
                    metrics: [
                        { label: "Migration Time", value: "3 mins" },
                        { label: "Data Quality", value: "Audit-Safe" }
                    ]
                },
                {
                    title: "Remediation Workflow",
                    description: "Automated task assignment and tracking with real-time heartbeat.",
                    metrics: [
                        { label: "Ownership Clarity", value: "100%" },
                        { label: "Task Completion", value: "2x Faster" }
                    ]
                }
            ]
        },
        {
            id: "tier3",
            name: "TIER 3",
            title: "Executive Economics",
            description: "Communicate risk impact in the language of the board and unlock budgets.",
            color: "from-indigo-600 to-purple-600",
            icon: <Zap className="w-6 h-6 text-white" />,
            subsections: [
                {
                    title: "Financial Impact Ranges",
                    description: "Translate risk scores into dollar amounts using economics modeling.",
                    metrics: [
                        { label: "Budget Alignment", value: "Precise" },
                        { label: "Strategic Value", value: "High" }
                    ]
                },
                {
                    title: "Storytelling Insights",
                    description: "AI-generated executive summaries highlighting what truly matters.",
                    metrics: [
                        { label: "Board Approval", value: "Faster" },
                        { label: "Risk Exposure", value: "-35%" }
                    ]
                }
            ]
        }
    ];

    return (
        <section id="product" className="py-24 px-6 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-extrabold mb-6"
                    >
                        Strategic <span className="text-gradient">Business Value</span>
                    </motion.h2>
                    <p className="text-white/60 max-w-3xl mx-auto text-lg">
                        SWOT Risk helps you move from spreadsheet chaos to automated control.
                        Unlock business value through AI-powered risk intelligence.
                    </p>
                </div>

                <div className="space-y-12">
                    {tiers.map((tier, tIdx) => (
                        <motion.div
                            key={tier.id}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: tIdx * 0.1 }}
                            className="relative group"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${tier.color} opacity-[0.03] rounded-3xl group-hover:opacity-[0.05] transition-opacity duration-500 border border-white/5`} />

                            <div className="relative p-8 md:p-12">
                                <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${tier.color} text-white shadow-lg`}>
                                        {tier.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`text-sm font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70`}>
                                                {tier.name}
                                            </span>
                                            <div className={`h-[1px] w-12 bg-gradient-to-r ${tier.color}`} />
                                        </div>
                                        <h3 className="text-3xl font-bold">{tier.title}</h3>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-10">
                                    {tier.subsections.map((sub, sIdx) => (
                                        <div key={sIdx} className="glass p-8 rounded-2xl bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors">
                                            <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tier.color}`} />
                                                {sub.title}
                                            </h4>
                                            {sub.description && (
                                                <p className="text-white/50 text-sm mb-6 pb-4 border-b border-white/5">
                                                    {sub.description}
                                                </p>
                                            )}

                                            <div className="space-y-4">
                                                {sub.metrics && sub.metrics.map((m, mIdx) => (
                                                    <div key={mIdx} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1 hover:bg-white/[0.05] transition-colors">
                                                        <span className="text-lg font-bold text-white/90">{m.value}</span>
                                                        <span className="text-xs text-white/40 uppercase tracking-widest">{m.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Background decorative elements */}
            <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 translate-x-[-50%] translate-y-[-50%]" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px] -z-10 translate-x-[30%] translate-y-[30%]" />
        </section>
    );
};

export default ValueProposition;
