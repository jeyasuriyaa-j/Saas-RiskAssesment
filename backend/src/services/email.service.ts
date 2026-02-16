import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Create transporter with SMTP config
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

// Verify connection on startup (non-blocking)
transporter.verify((error: Error | null) => {
    if (error) {
        logger.warn('Email service not configured or invalid:', error.message);
    } else {
        logger.info('Email service ready');
    }
});

export const emailService = {
    /**
     * Send an email
     */
    async send(options: EmailOptions): Promise<boolean> {
        const { to, subject, html, text } = options;

        // Skip if not configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            logger.info(`Email skipped (not configured): ${subject} to ${to}`);
            return false;
        }

        try {
            const info = await transporter.sendMail({
                from: `"Risk Manager" <${process.env.SMTP_USER}>`,
                to,
                subject,
                text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
                html,
            });

            logger.info(`Email sent: ${info.messageId} to ${to}`);
            return true;
        } catch (error: any) {
            logger.error(`Failed to send email to ${to}:`, error.message);
            return false;
        }
    },

    /**
     * Send task assignment notification
     */
    async sendTaskAssignment(params: {
        assigneeEmail: string;
        assigneeName: string;
        taskTitle: string;
        taskDescription?: string;
        riskCode?: string;
        riskStatement?: string;
        dueDate?: string;
        priority?: string;
        assignerName?: string;
    }): Promise<boolean> {
        const {
            assigneeEmail,
            assigneeName,
            taskTitle,
            taskDescription,
            riskCode,
            riskStatement,
            dueDate,
            priority,
            assignerName
        } = params;

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Inter', Arial, sans-serif; background: #0a1929; color: #ffffff; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { color: #00d4ff; font-size: 24px; font-weight: 700; }
                .card { background: #0d2137; border: 1px solid rgba(0,212,255,0.2); border-radius: 12px; padding: 30px; }
                h1 { color: #00d4ff; font-size: 20px; margin-bottom: 20px; }
                .task-title { color: #ffffff; font-size: 18px; font-weight: 600; margin-bottom: 16px; }
                .detail { color: #94a3b8; margin-bottom: 12px; }
                .label { color: #00d4ff; font-weight: 500; }
                .priority-high { color: #ff5252; }
                .priority-medium { color: #ffab40; }
                .priority-low { color: #00e676; }
                .button { 
                    display: inline-block; 
                    background: linear-gradient(135deg, #00d4ff, #00a6cc); 
                    color: #0a1929; 
                    padding: 12px 30px; 
                    border-radius: 8px; 
                    text-decoration: none; 
                    font-weight: 600;
                    margin-top: 20px;
                }
                .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🛡️ Risk Manager</div>
                </div>
                <div class="card">
                    <h1>New Task Assigned</h1>
                    <p style="color: #94a3b8;">Hi ${assigneeName},</p>
                    <p style="color: #ffffff; margin-bottom: 20px;">
                        ${assignerName ? `${assignerName} has` : 'You have been'} assigned a new task:
                    </p>
                    
                    <div class="task-title">${taskTitle}</div>
                    
                    ${taskDescription ? `<div class="detail">${taskDescription}</div>` : ''}
                    
                    ${riskCode ? `
                    <div class="detail">
                        <span class="label">Related Risk:</span> ${riskCode} - ${riskStatement || ''}
                    </div>
                    ` : ''}
                    
                    ${dueDate ? `
                    <div class="detail">
                        <span class="label">Due Date:</span> ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    ` : ''}
                    
                    ${priority ? `
                    <div class="detail">
                        <span class="label">Priority:</span> 
                        <span class="priority-${priority.toLowerCase()}">${priority}</span>
                    </div>
                    ` : ''}
                    
                    <a href="${frontendUrl}/my-tasks" class="button">View My Tasks →</a>
                </div>
                <div class="footer">
                    This email was sent by Risk Manager. Please do not reply directly.
                </div>
            </div>
        </body>
        </html>
        `;

        return this.send({
            to: assigneeEmail,
            subject: `🔔 New Task: ${taskTitle}`,
            html,
        });
    },

    /**
     * Send incident alert to admins
     */
    async sendIncidentAlert(params: {
        recipients: string[];
        eventName: string;
        severity: string;
        description: string;
        occurredAt: Date;
        reportedBy: string;
    }): Promise<boolean> {
        const { recipients, eventName, severity, description, occurredAt, reportedBy } = params;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Filter out duplicates
        const uniqueRecipients = [...new Set(recipients)];

        if (uniqueRecipients.length === 0) return false;

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Inter', Arial, sans-serif; background: #0a1929; color: #ffffff; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { color: #ff5252; font-size: 24px; font-weight: 700; }
                .card { background: #0d2137; border: 1px solid rgba(255,82,82,0.3); border-radius: 12px; padding: 30px; }
                h1 { color: #ff5252; font-size: 22px; margin-bottom: 20px; }
                .event-title { color: #ffffff; font-size: 18px; font-weight: 600; margin-bottom: 16px; }
                .detail { color: #94a3b8; margin-bottom: 12px; font-size: 14px; }
                .label { color: #00d4ff; font-weight: 500; }
                .severity-tag { 
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                .sev-high, .sev-critical { background: rgba(255, 82, 82, 0.2); color: #ff5252; border: 1px solid #ff5252; }
                .sev-medium { background: rgba(255, 171, 64, 0.2); color: #ffab40; border: 1px solid #ffab40; }
                .sev-low { background: rgba(0, 230, 118, 0.2); color: #00e676; border: 1px solid #00e676; }
                
                .button { 
                    display: inline-block; 
                    background: #ff5252; 
                    color: #ffffff; 
                    padding: 12px 30px; 
                    border-radius: 8px; 
                    text-decoration: none; 
                    font-weight: 600;
                    margin-top: 20px;
                }
                .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🚨 Incident Alert</div>
                </div>
                <div class="card">
                    <h1>New Incident Reported</h1>
                    
                    <div class="event-title">${eventName}</div>
                    
                    <div class="detail">
                        <span class="label">Severity:</span> 
                        <span class="severity-tag sev-${severity.toLowerCase()}">${severity}</span>
                    </div>

                    <div class="detail">
                        <span class="label">Reported By:</span> ${reportedBy}
                    </div>

                    <div class="detail">
                        <span class="label">Time:</span> ${new Date(occurredAt).toLocaleString()}
                    </div>
                    
                    <div class="detail" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <span class="label">Description:</span><br/>
                        ${description}
                    </div>
                    
                    <a href="${frontendUrl}/incidents" class="button">View Incident Details</a>
                </div>
                <div class="footer">
                    This is an automated alert. Please verify in the system.
                </div>
            </div>
        </body>
        </html>
        `;

        // Send to all recipients
        const sendPromises = uniqueRecipients.map(to =>
            this.send({
                to,
                subject: `🚨 [${severity}] Incident: ${eventName}`,
                html,
            })
        );

        await Promise.all(sendPromises);
        return true;
    },

    /**
     * Send risk status update notification
     */
    async sendRiskUpdate(params: {
        ownerEmail: string;
        ownerName: string;
        riskCode: string;
        riskStatement: string;
        oldStatus: string;
        newStatus: string;
        updatedBy: string;
    }): Promise<boolean> {
        const { ownerEmail, ownerName, riskCode, riskStatement, oldStatus, newStatus, updatedBy } = params;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Inter', Arial, sans-serif; background: #0a1929; color: #ffffff; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .logo { color: #00d4ff; font-size: 24px; font-weight: 700; }
                .card { background: #0d2137; border: 1px solid rgba(0,212,255,0.2); border-radius: 12px; padding: 30px; }
                h1 { color: #00d4ff; font-size: 20px; margin-bottom: 20px; }
                .risk-title { color: #ffffff; font-size: 16px; font-weight: 600; margin-bottom: 16px; }
                .detail { color: #94a3b8; margin-bottom: 12px; }
                .label { color: #00d4ff; font-weight: 500; }
                .status-change { 
                    background: rgba(255, 255, 255, 0.05); 
                    padding: 10px; 
                    border-radius: 6px; 
                    text-align: center;
                    margin: 15px 0;
                    font-family: monospace;
                    font-size: 14px;
                }
                .button { 
                    display: inline-block; 
                    background: #00d4ff; 
                    color: #0a1929; 
                    padding: 10px 24px; 
                    border-radius: 6px; 
                    text-decoration: none; 
                    font-weight: 600;
                    margin-top: 20px;
                }
                .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">Risk Status Update</div>
                </div>
                <div class="card">
                    <p style="color: #94a3b8;">Hi ${ownerName},</p>
                    <p>The status of a risk you own has been updated by <strong>${updatedBy}</strong>.</p>
                    
                    <div class="risk-title">${riskCode}: ${riskStatement}</div>
                    
                    <div class="status-change">
                        ${oldStatus} ➝ <span style="color: #00e676;">${newStatus}</span>
                    </div>

                    <a href="${frontendUrl}/risk-register" class="button">View Risk Register</a>
                </div>
                <div class="footer">
                    Risk Management System
                </div>
            </div>
        </body>
        </html>
        `;

        return this.send({
            to: ownerEmail,
            subject: `Risk Update: ${riskCode} is now ${newStatus}`,
            html,
        });
    },
};

// Export standalone sendEmail function
export async function sendEmail(options: EmailOptions): Promise<boolean> {
    return emailService.send(options);
}

