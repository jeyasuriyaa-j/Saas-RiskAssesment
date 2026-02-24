/**
 * Context Builder Service
 * Summarizes filtered data into a concise text format for the AI prompt.
 */
export const contextBuilder = {
    /**
     * Build the context string from database entities.
     */
    buildContext: (data: {
        risks: any[],
        controls: any[],
        events: any[],
        users: any[],
        remediationPlans: any[],
        user: any,
        userProfile?: any
    }) => {
        const role = data.user.role;
        const canViewUsers = ['admin', 'risk_manager'].includes(role);

        // Display name from profile (fetched from DB), fallback to role
        const displayName = data.userProfile?.full_name || `${role} user`;

        let context = `You are the Risk Assessment Platform AI Assistant.\n`;
        context += `Answer questions concisely and accurately using only the data provided below.\n\n`;

        // User Context
        context += `=== USER PROFILE ===\n`;
        context += `Name: ${displayName}\n`;
        if (data.userProfile?.email) context += `Email: ${data.userProfile.email}\n`;
        context += `Role: ${role}\n`;
        if (data.userProfile?.department) context += `Department: ${data.userProfile.department}\n`;
        context += `\n`;

        // Summary Stats
        const activeRisks = data.risks.filter(r => r.status === 'ACTIVE').length;
        const criticalRisks = data.risks.filter(r => (r.inherent_risk_score || 0) >= 20).length;
        const highRisks = data.risks.filter(r => (r.inherent_risk_score || 0) >= 15 && (r.inherent_risk_score || 0) < 20).length;
        const overdueTasks = data.remediationPlans.filter(p => p.due_date && new Date(p.due_date) < new Date() && p.status !== 'COMPLETED').length;

        context += `=== SUMMARY STATISTICS ===\n`;
        context += `Total Risks: ${data.risks.length} (Active: ${activeRisks}, Critical: ${criticalRisks}, High: ${highRisks})\n`;
        context += `Total Controls: ${data.controls.length}\n`;
        context += `Total Incidents/Events: ${data.events.length}\n`;
        context += `Remediation Tasks: ${data.remediationPlans.length} (Overdue: ${overdueTasks})\n`;
        if (canViewUsers) context += `Total Users: ${data.users.length}\n`;
        context += `\n`;

        // Risks Context (increased limit to 50)
        if (data.risks.length > 0) {
            context += `=== RISKS ===\n`;
            data.risks.slice(0, 50).forEach(r => {
                const score = r.inherent_risk_score ? ` Score:${r.inherent_risk_score}` : '';
                const priority = r.priority ? ` [${r.priority}]` : '';
                context += `- [${r.status}]${priority} ${r.risk_code ? `(${r.risk_code}) ` : ''}${r.statement} (Category: ${r.category || 'N/A'}, L:${r.likelihood_score || '?'}, I:${r.impact_score || '?'}${score})\n`;
            });
            if (data.risks.length > 50) context += `  ... and ${data.risks.length - 50} more risks.\n`;
            context += `\n`;
        }

        // Remediation Plans
        if (data.remediationPlans.length > 0) {
            context += `=== REMEDIATION TASKS ===\n`;
            data.remediationPlans.slice(0, 30).forEach(p => {
                const due = p.due_date ? ` Due: ${new Date(p.due_date).toLocaleDateString()}` : '';
                const assignee = p.assignee_name ? ` → ${p.assignee_name}` : '';
                context += `- [${p.status}] ${p.action_title}${assignee}${due} (Risk: ${p.risk_code || 'N/A'})\n`;
            });
            context += `\n`;
        }

        // Controls Context
        if (data.controls.length > 0) {
            context += `=== CONTROLS ===\n`;
            data.controls.slice(0, 20).forEach(c => {
                const eff = c.effectiveness_percent != null ? ` Eff:${c.effectiveness_percent}%` : '';
                context += `- [${c.implementation_status || 'N/A'}] ${c.control_name} (${c.control_type || 'N/A'}${eff})\n`;
            });
            context += `\n`;
        }

        // Events Context
        if (data.events.length > 0) {
            context += `=== INCIDENTS/EVENTS ===\n`;
            data.events.slice(0, 10).forEach(e => {
                const date = e.occurred_at ? ` on ${new Date(e.occurred_at).toLocaleDateString()}` : '';
                context += `- [${e.severity || 'N/A'}] ${e.event_name} (${e.event_type || 'N/A'})${date}\n`;
            });
            context += `\n`;
        }

        // Users — only for admin / risk_manager
        if (canViewUsers && data.users.length > 0) {
            context += `=== USERS (${data.users.length} total) ===\n`;
            data.users.forEach(u => {
                const dept = u.department ? `, Dept: ${u.department}` : '';
                const status = u.is_active ? '' : ' [INACTIVE]';
                context += `- ${u.full_name} <${u.email}> — Role: ${u.role}${dept}${status}\n`;
            });
            context += `\n`;
        }

        // Role-specific instructions
        context += `=== INSTRUCTIONS ===\n`;
        context += `1. Answer ONLY from the data provided above.\n`;
        context += `2. Be concise: lead with the direct answer, then supporting details.\n`;
        context += `3. For counts and summaries, use the SUMMARY STATISTICS section.\n`;
        context += `4. For risk-specific questions, refer to the RISKS section.\n`;
        context += `5. For task questions, refer to the REMEDIATION TASKS section.\n`;
        if (!canViewUsers) {
            context += `6. For user-related questions (other than yourself), say you do not have access to that information.\n`;
        }
        context += `7. If information is not in the context, say "I don't have that information in the current data."\n`;
        context += `8. Format lists clearly with bullet points when relevant.\n`;

        return context;
    }
};
