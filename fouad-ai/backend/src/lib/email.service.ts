import Mailgun from 'mailgun.js';
import FormData from 'form-data';
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
  private mailgunClient: any = null;
  private templateCache: Map<string, string> = new Map();
  private isInitialized = false;

  /**
   * Initialize Mailgun HTTP client from environment variables
   *
   * Why HTTP API instead of SMTP?
   * Railway (and many PaaS providers) block outbound SMTP connections (ports 25, 465, 587)
   * for security/anti-spam reasons. Mailgun's HTTP API works perfectly on Railway.
   */
  initializeMailgun(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      const apiKey = process.env.MAILGUN_API_KEY;
      const domain = process.env.MAILGUN_DOMAIN;

      // Validate required config
      if (!apiKey || !domain) {
        console.warn('Email service: Mailgun API configuration incomplete, emails will not be sent');
        console.warn('Required: MAILGUN_API_KEY and MAILGUN_DOMAIN');
        return;
      }

      const mailgun = new Mailgun(FormData);
      this.mailgunClient = mailgun.client({
        username: 'api',
        key: apiKey,
      });

      this.isInitialized = true;
      console.log('✅ Email service initialized successfully with Mailgun HTTP API');
      console.log(`   Domain: ${domain}`);
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

    // Debug: Log variables being replaced
    console.log(`📧 Rendering template "${templateName}" with variables:`, Object.keys(variables));

    // Replace all {{variable}} placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const stringValue = value !== null && value !== undefined ? String(value) : '';
      const matchCount = (template.match(placeholder) || []).length;

      if (matchCount > 0) {
        template = template.replace(placeholder, stringValue);
        console.log(`   ✓ Replaced {{${key}}} (${matchCount} occurrence(s))`);
      }
    });

    // Check for unreplaced variables
    const unreplacedVars = template.match(/{{[^}]+}}/g);
    if (unreplacedVars && unreplacedVars.length > 0) {
      console.warn(`⚠️  Unreplaced variables in template "${templateName}":`, unreplacedVars);
    }

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
   * Send email with template rendering using Mailgun HTTP API
   * This function never throws - it always returns a result object
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    // Initialize Mailgun client if not already done
    if (!this.isInitialized) {
      this.initializeMailgun();
    }

    // If Mailgun client is not available, fail gracefully
    if (!this.mailgunClient) {
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
        console.log(`📧 Test mode: Redirecting email to ${testRecipient}`);
        console.log(`   Original recipients: ${validRecipients.join(', ')}`);
        finalRecipients = [testRecipient];
      }

      // Render email template
      const html = await this.renderTemplate(options.template, options.variables);

      // Send email via Mailgun HTTP API
      const domain = process.env.MAILGUN_DOMAIN || 'mg.dealguard.org';
      const result = await this.mailgunClient.messages.create(domain, {
        from: process.env.EMAIL_FROM || 'DealGuard <noreply@dealguard.org>',
        to: finalRecipients,
        subject: options.subject,
        html,
      });

      console.log('✅ Email sent successfully:', {
        messageId: result.id,
        template: options.template,
        recipients: finalRecipients,
        dealId: options.dealId,
      });

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error: any) {
      const errorMessage = error.message || error.toString();
      console.error('❌ Failed to send email:', {
        error: errorMessage,
        template: options.template,
        dealId: options.dealId,
        details: error.details || error,
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
