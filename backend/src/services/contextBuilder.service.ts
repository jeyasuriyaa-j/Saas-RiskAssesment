/**
 * Context Builder Service
 * Summarizes filtered data into a concise text format for the AI prompt.
 */
export const contextBuilder = {
    /**
     * Build the context string from database entities.
     */
    buildContext: (data: { risks: any[], controls: any[], events: any[], users: any[], user: any }) => {
        let context = "You are the Risk Assessment Platform Assistant.\n\n";

        // User Context
        context += "USER PROFILE:\n";
        context += `- Name: ${data.user.full_name}\n`;
        context += `- Email: ${data.user.email}\n`;
        context += `- Role: ${data.user.role}\n`;
        context += `- Organization/Tenant: ${data.user.tenantId}\n\n`;

        // Summary Stats
        context += "SUMMARY STATISTICS:\n";
        context += `- Total Risks: ${data.risks.length}\n`;
        const pending = data.risks.filter(r => r.status === 'DRAFT' || r.status === 'mapping').length;
        context += `- Pending/Draft Risks: ${pending}\n`;
        context += `- Total Controls: ${data.controls.length}\n`;
        context += `- Total Incidents: ${data.events.length}\n`;
        context += `- Total Users: ${data.users?.length || 0}\n\n`;

        // Risks Context
        if (data.risks.length > 0) {
            context += "RISKS:\n";
            data.risks.slice(0, 15).forEach(r => {
                context += `- [${r.status}] ${r.statement} (Category: ${r.category}, L:${r.likelihood_score}, I:${r.impact_score})\n`;
            });
            if (data.risks.length > 15) context += "- ... and more risks not listed here.\n";
            context += "\n";
        }

        // Controls Context
        if (data.controls.length > 0) {
            context += "CONTROLS:\n";
            data.controls.slice(0, 10).forEach(c => {
                context += `- [${c.implementation_status}] ${c.control_name}\n`;
            });
            context += "\n";
        }

        // Events Context
        if (data.events.length > 0) {
            context += "INCIDENTS/EVENTS:\n";
            data.events.slice(0, 5).forEach(e => {
                context += `- [${e.severity}] ${e.event_name} (${e.event_type})\n`;
            });
            context += "\n";
        }

        // Users Context (only for admin and risk_manager roles)
        if (data.users && data.users.length > 0 && ['admin', 'risk_manager'].includes(data.user.role)) {
            context += "USERS:\n";
            data.users.forEach(u => {
                context += `- ${u.full_name} (${u.email}) - Role: ${u.role}${u.department ? `, Dept: ${u.department}` : ''}${u.is_active ? '' : ' [INACTIVE]'}\n`;
            });
            context += "\n";
        }

        // Guardrails
        const canViewUsers = ['admin', 'risk_manager'].includes(data.user.role);
        context += `
INSTRUCTIONS:
1. Answer questions using ONLY the information provided in the context above.
2. For user-related questions (like "list users", "how many users", "show me users"), ${canViewUsers ? 'provide the information from the USERS section above. Include names, emails, roles, and departments.' : 'say you do not have access to that information.'}
3. For questions about risks, controls, or incidents, use the data provided in those sections.
4. Keep answers concise and professional.
5. If the user asks for something not in the context, politely say you don't have access to that information.
6. If there are no items in a category, mention that the list is empty.
`;

        return context;
    }
};
