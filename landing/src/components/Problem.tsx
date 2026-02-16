import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, Users, EyeOff } from 'lucide-react';

const painPoints = [
    {
        icon: <AlertTriangle className="w-8 h-8 text-error" />,
        title: "Spreadsheets Everywhere",
        description: "Fragmented data across multiple files makes it impossible to maintain a single source of truth."
    },
    {
        icon: <Users className="w-8 h-8 text-primary-light" />,
        title: "No Ownership",
        description: "Risks are identified but remediation tasks get lost in emails with no clear accountability."
    },
    {
        icon: <Clock className="w-8 h-8 text-secondary-light" />,
        title: "Slow Assessments",
        description: "Manual scoring takes weeks, delaying critical mitigation strategies when they're needed most."
    },
    {
        icon: <EyeOff className="w-8 h-8 text-accent" />,
        title: "Zero Visibility",
        description: "Leadership lacks a real-time view of the organization's risk posture and mitigation progress."
    }
];

const Problem: React.FC = () => {
    return (
        <section className="py-24 px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-bold mb-4"
                    >
                        Manual Risk Management Is <span className="text-error">Broken</span>
                    </motion.h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        Traditional methods can't keep up with modern enterprise complexity.
                        Legacy systems and spreadsheets are the biggest risks to your security.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {painPoints.map((point, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="glass p-8 rounded-2xl glass-hover group"
                        >
                            <div className="mb-6 p-3 rounded-lg bg-white/5 w-fit group-hover:bg-primary/10 transition-colors">
                                {point.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-3">{point.title}</h3>
                            <p className="text-sm text-white/50 leading-relaxed">
                                {point.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Problem;
