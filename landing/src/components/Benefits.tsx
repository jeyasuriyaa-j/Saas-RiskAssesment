import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const BenefitCard = ({ label, value, subtext, index }: { label: string, value: string, subtext: string, index: number }) => {
    const controls = useAnimation();
    const [ref, inView] = useInView();
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (inView) {
            controls.start('visible');
            const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
            let start = 0;
            const duration = 1500;
            const stepTime = Math.abs(Math.floor(duration / numericValue));

            const timer = setInterval(() => {
                start += 1;
                setDisplayValue(start);
                if (start === numericValue) clearInterval(timer);
            }, stepTime);

            return () => clearInterval(timer);
        }
    }, [inView, controls, value]);

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={controls}
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { delay: index * 0.1 } }
            }}
            className="glass p-8 rounded-2xl text-center relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-all duration-500" />
            <div className="text-4xl md:text-5xl font-black mb-2 text-gradient">
                {displayValue}{value.replace(/[0-9]/g, '')}
            </div>
            <div className="text-lg font-bold mb-2">{label}</div>
            <div className="text-sm text-white/50">{subtext}</div>
        </motion.div>
    );
};

const Benefits: React.FC = () => {
    const stats = [
        { label: "Faster Assessment", value: "70%", subtext: "Average reduction in time to score risks" },
        { label: "Better Visibility", value: "10x", subtext: "Increase in cross-department risk transparency" },
        { label: "Ownership Clarity", value: "100%", subtext: "Automated tracking for every identified threat" },
        { label: "Audit-Ready", value: "24/7", subtext: "Always-on reporting for compliance and leadership" }
    ];

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
                        Quantifiable <span className="text-gradient">Business Value</span>
                    </motion.h2>
                    <p className="text-white/60 max-w-2xl mx-auto">
                        Our platform doesn't just manage risk—it accelerates growth by removing manual friction.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <BenefitCard key={index} {...stat} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Benefits;
