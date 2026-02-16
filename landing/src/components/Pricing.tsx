import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const tiers = [
    {
        name: "Starter",
        price: "Free",
        description: "Perfect for small teams getting started with risk management.",
        features: [
            "Up to 50 active risks",
            "Basic AI scoring",
            "Manual task assignment",
            "Excel import (single file)",
            "Standard dashboard"
        ],
        buttonText: "Get Started Free",
        popular: false
    },
    {
        name: "Professional",
        price: "$499/mo",
        description: "Complete risk intelligence for growing enterprises.",
        features: [
            "Unlimited active risks",
            "Advanced AI analysis",
            "Bulk remediation engine",
            "Department-level isolation",
            "Email & In-app notifications",
            "Custom risk appetite framework"
        ],
        buttonText: "Start 14-Day Trial",
        popular: true
    },
    {
        name: "Enterprise",
        price: "Custom",
        description: "Dedicated infrastructure and support for global organizations.",
        features: [
            "Private cloud deployment",
            "SSO & Directory Sync",
            "API access for integrations",
            "Dedicated account manager",
            "SLA & priority support",
            "Custom compliance reporting"
        ],
        buttonText: "Contact Sales",
        popular: false
    }
];

const Pricing: React.FC = () => {
    return (
        <section id="pricing" className="py-24 px-6 relative">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl font-bold mb-4"
                    >
                        Transparent <span className="text-gradient">Pricing</span>
                    </motion.h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        Scale your risk management as you grow. Start for free and upgrade when you're ready.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {tiers.map((tier, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`glass p-8 rounded-3xl relative flex flex-col h-full transition-all duration-300 ${tier.popular ? 'border-primary/50 shadow-[0_0_40px_rgba(139,92,246,0.2)] scale-105 z-10' : 'border-white/5'
                                }`}
                        >
                            {tier.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-xs font-bold uppercase tracking-wider">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-white/50 mb-2 uppercase tracking-wide">{tier.name}</h3>
                                <div className="text-4xl font-black mb-4">{tier.price}</div>
                                <p className="text-sm text-white/50 leading-relaxed">{tier.description}</p>
                            </div>

                            <div className="flex-grow">
                                <ul className="space-y-4 mb-8">
                                    {tier.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-start gap-3">
                                            <div className="mt-1 p-0.5 rounded-full bg-primary/20 text-primary-light">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-sm text-white/70">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button className={`w-full py-4 rounded-xl font-bold transition-all ${tier.popular
                                    ? 'btn-primary'
                                    : 'glass bg-white/5 hover:bg-white/10'
                                }`}>
                                {tier.buttonText}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
