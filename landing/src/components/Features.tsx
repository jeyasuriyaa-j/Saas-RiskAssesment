import React from 'react';
import { motion } from 'framer-motion';
import {
    Brain,
    Target,
    CheckSquare,
    Building2,
    Mail,
    LayoutDashboard,
    FileJson,
    History
} from 'lucide-react';

const features = [
    {
        icon: <Brain className="w-6 h-6" />,
        title: "AI Authoring Assistant",
        description: "Convert vague descriptions into audit-safe cause-event-impact statements."
    },
    {
        icon: <Target className="w-6 h-6" />,
        title: "Risk Correlation Graphs",
        description: "Visualize cascading risks across your business units with dynamic network maps."
    },
    {
        icon: <CheckSquare className="w-6 h-6" />,
        title: "Stakeholder Briefs",
        description: "AI-generated executive summaries tailored for the Board, CRO, and Technical Teams."
    },
    {
        icon: <Building2 className="w-6 h-6" />,
        title: "Excel Auto-Mapping",
        description: "Intelligent column parsing and duplicate detection for seamless spreadsheet migrations."
    },
    {
        icon: <Mail className="w-6 h-6" />,
        title: "Remediation Heartbeat",
        description: "Real-time task tracking and ownership clarity with automated email notifications."
    },
    {
        icon: <LayoutDashboard className="w-6 h-6" />,
        title: "Interactive Heatmaps",
        description: "Dynamic visualization of your risk posture based on likelihood and impact scores."
    },
    {
        icon: <FileJson className="w-6 h-6" />,
        title: "Excel Import",
        description: "Seamlessly transition from manual spreadsheets with our intelligent bulk importer."
    },
    {
        icon: <History className="w-6 h-6" />,
        title: "Audit Trails",
        description: "Comprehensive history of every change, assignment, and status update for compliance."
    }
];

const Features: React.FC = () => {
    return (
        <section id="features" className="py-24 px-6 bg-white/[0.02]">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-bold mb-4"
                    >
                        Everything You Need to <span className="text-gradient">Control Risk</span>
                    </motion.h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        A comprehensive suite of intelligence tools designed for modern security and compliance teams.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            className="glass p-6 rounded-2xl glass-hover group"
                        >
                            <div className="mb-4 p-2 rounded-lg bg-primary/10 text-primary-light w-fit group-hover:scale-110 transition-transform duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-bold mb-2 group-hover:text-primary-light transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-white/50 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
