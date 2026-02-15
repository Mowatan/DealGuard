import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  variables: Record<string, any>;
  dealId?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private templateCache: Map<string, string> = new Map();
  private isInitialized = false;

  /**
   * Initialize nodemailer transporter from environment variables
   */
  initializeTransporter(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      };

      // Validate required config
      if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
        console.warn('Email service: SMTP configuration incomplete, emails will not be sent');
        return;
      }

      this.transporter = nodemailer.createTransport(smtpConfig);
      this.isInitialized = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Load and cache email template from filesystem
   */
  private async loadTemplate(templateName: string): Promise<string> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    try {
      const templatePath = path.join(
        __dirname,
        '..',
        '..',
        'templates',
        'emails',
        `${templateName}.html`
      );

      const content = await fs.readFile(templatePath, 'utf-8');
      this.templateCache.set(templateName, content);
      return content;
    } catch (error) {
      console.error(`Failed to load email template ${templateName}:`, error);
      throw new Error(`Email template ${templateName} not found`);
    }
  }

  /**
   * Render template with variables using simple {{variable}} replacement
   */
  private async renderTemplate(
    templateName: string,
    variables: Record<string, any>
  ): Promise<string> {
    let template = await this.loadTemplate(templateName);

    // Replace all {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const stringValue = value !== null && value !== undefined ? String(value) : '';
      template = template.replace(placeholder, stringValue);
    });

    return template;
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Send email with template rendering
   * This function never throws - it always returns a result object
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    // Initialize transporter if not already done
    if (!this.isInitialized) {
      this.initializeTransporter();
    }

    // If transporter is not available, fail gracefully
    if (!this.transporter) {
      console.warn('Email service not configured, skipping email send');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      // Validate recipients
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const validRecipients = recipients.filter((email) => this.isValidEmail(email));

      if (validRecipients.length === 0) {
        console.warn('No valid email recipients provided');
        return {
          success: false,
          error: 'No valid email recipients',
        };
      }

      // In test mode, redirect all emails to test recipient
      const testMode = process.env.EMAIL_TEST_MODE === 'true';
      const testRecipient = process.env.EMAIL_TEST_RECIPIENT;

      let finalRecipients = validRecipients;
      if (testMode && testRecipient) {
        console.log(`Test mode: Redirecting email to ${testRecipient}`);
        console.log(`Original recipients: ${validRecipients.join(', ')}`);
        finalRecipients = [testRecipient];
      }

      // Render email template
      const html = await this.renderTemplate(options.template, options.variables);

      // Send email
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'DealGuard <noreply@dealguard.org>',
        to: finalRecipients.join(', '),
        subject: options.subject,
        html,
      });

      console.log('Email sent successfully:', {
        messageId: result.messageId,
        template: options.template,
        recipients: finalRecipients,
        dealId: options.dealId,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send email:', {
        error: errorMessage,
        template: options.template,
        dealId: options.dealId,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

// Export singleton instance
export const emailService = new EmailService();
