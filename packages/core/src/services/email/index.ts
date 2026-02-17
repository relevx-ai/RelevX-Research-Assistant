import { Resend } from "resend";
import { ClientReport } from "../llm/types";
import { marked } from "marked";
import { stripReferencesForEmail } from "../../utils/markdown-references";

// Initialize Resend client
// We'll lazily initialize this to avoid errors if the API key is missing during build/test
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Extended report options for email
 */
export interface ReportEmailOptions {
  summary?: string;
  resultCount?: number;
  averageScore?: number;
}

/**
 * Generate the branded HTML email template
 */
async function generateEmailHTML(
  report: ClientReport,
  projectId: string,
  projectTitle: string,
  options?: ReportEmailOptions
): Promise<string> {
  // Strip references and external links from email version
  const emailMarkdown = stripReferencesForEmail(report.markdown);
  // Convert markdown to HTML
  const markdownHtml = await marked.parse(emailMarkdown, { async: true });

  // Format current date
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Build summary section if available
  // const summarySection = options?.summary
  //   ? `
  //       <tr>
  //         <td style="padding: 0 40px 30px 40px;">
  //           <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%) !important; background-color: #1e3a5f !important; border-radius: 12px;">
  //             <tr>
  //               <td style="padding: 24px 28px;">
  //                 <div class="text-sky" style="font-size: 11px; font-weight: 600; color: #38bdf8 !important; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Summary</div>
  //                 <div style="font-size: 15px; color: #e2e8f0 !important; line-height: 1.7;">${options.summary}</div>
  //               </td>
  //             </tr>
  //           </table>
  //         </td>
  //       </tr>
  //     `
  //   : "";
  const hasSummary = Boolean(options?.summary?.trim());
  const summarySection = options?.summary?.trim() ?? "";

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office">
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    td,th,div,p,a,h1,h2,h3,h4,h5,h6,span,li,blockquote,code,pre {font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; mso-line-height-rule: exactly;}
  </style>
  <![endif]-->
  <style>
    /* Single font stack for entire email */
    body, table, td, th, div, p, a, h1, h2, h3, h4, h5, h6, span, li, blockquote, code, pre { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
    
    /* Reset styles */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9 !important; }
    
    /* RelevX light theme */
    .bg-outer { background-color: #f1f5f9 !important; }
    .bg-card { background-color: #ffffff !important; border: 1px solid #e2e8f0; }
    
    /* Content styles - light theme, teal accents */
    .content-area h1 { color: #0f172a !important; font-size: 28px; font-weight: 700; line-height: 1.3; margin: 0 0 20px 0; letter-spacing: -0.025em; }
    .content-area h2 { color: #1e293b !important; font-size: 20px; font-weight: 700; line-height: 1.4; margin: 32px 0 16px 0; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; letter-spacing: -0.025em; }
    .content-area h3 { color: #334155 !important; font-size: 18px; font-weight: 600; line-height: 1.4; margin: 24px 0 12px 0; letter-spacing: -0.025em; }
    .content-area p { color: #475569 !important; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; }
    .content-area a { color: #0d9488 !important; text-decoration: none; border-bottom: 1px solid #99f6e4; }
    .content-area a:hover { border-bottom-color: #0d9488; }
    .content-area ul, .content-area ol { margin: 0 0 20px 0; padding-left: 24px; color: #475569 !important; }
    .content-area li { margin-bottom: 10px; font-size: 16px; line-height: 1.6; color: #475569 !important; }
    .content-area strong { color: #1e293b !important; font-weight: 600; }
    .content-area blockquote {
      margin: 20px 0;
      padding: 16px 20px;
      background-color: #f8fafc !important;
      border-left: 4px solid #14b8a6;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      font-size: 16px;
      color: #64748b !important;
    }
    .content-area img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #e2e8f0;
    }
    .content-area code {
      background-color: #f1f5f9 !important;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 14px;
      color: #0f172a !important;
    }
    .content-area pre {
      background-color: #1e293b !important;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 20px 0;
      border: 1px solid #e2e8f0;
    }
    .content-area pre code {
      background: none !important;
      padding: 0;
      color: #e2e8f0 !important;
      font-size: 14px;
      line-height: 1.6;
    }
    
    /* Utility classes */
    .text-foreground { color: #0f172a !important; }
    .text-muted { color: #64748b !important; }
    .text-teal { color: #0d9488 !important; }
    .text-teal-strong { color: #14b8a6 !important; }
    .text-white { color: #ffffff !important; }
    
    /* Rounded wrapper - clips inner table so corners are actually curved (table border-radius is ignored in many clients) */
    .rounded-wrapper {
      border-radius: 16px;
      -webkit-border-radius: 16px;
      overflow: hidden;
      max-width: 900px;
      width: 100%;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .content-area h1 { font-size: 24px !important; }
      .content-area h2 { font-size: 18px !important; }
      .content-area h3 { font-size: 16px !important; }
      .content-area p { font-size: 15px !important; }
      .content-area li { font-size: 15px !important; }
    }
    
    /* Force light theme only */
    @media (prefers-color-scheme: dark) {
      body, .bg-outer { background-color: #f1f5f9 !important; }
      .bg-card { background-color: #ffffff !important; }
    }
  </style>
</head>
<body class="bg-outer" style="margin: 0; padding: 0; background-color: #f1f5f9 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preview text -->
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Research Report - Your latest research insights from RelevX
  </div>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="bg-outer" style="background-color: #f1f5f9 !important;">
    <tr>
      <td align="center" style="padding: 40px 20px; background-color: #f1f5f9 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        
        <!-- Email Container: wrapper div creates actual rounded corners (table border-radius ignored in many clients) -->
        <div class="rounded-wrapper" style="border-radius: 16px; -webkit-border-radius: 16px; overflow: hidden; max-width: 900px; width: 100%; margin: 0 auto;">
          <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 900px; width: 100%; border-collapse: collapse;">
            
            <!-- Header (teal gradient) -->
            <tr>
              <td style="padding: 32px 40px; background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%); background-color: #0d9488 !important; border: 1px solid rgba(20, 184, 166, 0.3); border-bottom: none;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left">
                        <tr>
                          <td style="padding-right: 12px; vertical-align: middle;">
                            <table role="presentation" width="40" height="40" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); background-color: #14b8a6 !important; border-radius: 8px; -webkit-border-radius: 8px;">
                              <tr>
                                <td align="center" valign="middle" style="font-size: 20px; font-weight: 700; color: #0f172a !important;">R</td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align: middle;">
                            <div style="font-size: 18px; font-weight: 700; color: #ffffff !important; letter-spacing: -0.5px;">RelevX</div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.8) !important; text-transform: uppercase; letter-spacing: 1px;">AI-Powered Research Assistant</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <div style="font-size: 12px; color: rgba(255,255,255,0.85) !important;">${currentDate}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Report Title Section -->
            <tr>
              <td class="mobile-padding" style="padding: 40px 40px 24px 40px; background-color: #ffffff !important; border: 1px solid #e2e8f0; border-top: none;">
                <div style="font-size: 11px; font-weight: 600; color: #0d9488 !important; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Research Report</div>
                <h1 style="font-size: 28px; font-weight: 700; color: #0f172a !important; line-height: 1.3; margin: 0; letter-spacing: -0.025em;">${report.title}</h1>
              </td>
            </tr>
            
            ${hasSummary ? `<!-- Summary Section -->
            <tr>
              <td class="mobile-padding" style="padding: 0 40px 30px 40px; background-color: #ffffff !important; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                <div style="background-color: #f8fafc !important; padding: 20px; border-radius: 8px; -webkit-border-radius: 8px; border-left: 4px solid #14b8a6;">
                  <p style="font-size: 16px; line-height: 1.6; color: #475569 !important; margin: 0;">${summarySection}</p>
                </div>
              </td>
            </tr>
            ` : ""}
            
            <!-- Divider -->
            <tr>
              <td style="padding: 0 40px 30px 40px; background-color: #ffffff !important; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #e2e8f0 20%, #e2e8f0 80%, transparent 100%);"></div>
              </td>
            </tr>
            
            <!-- Main Report Content -->
            <tr>
              <td class="mobile-padding content-area" style="padding: 0 40px 40px 40px; background-color: #ffffff !important; border: 1px solid #e2e8f0; border-top: none;">
                ${markdownHtml}
              </td>
            </tr>
            
          </table>
        </div>
        
        <!-- Footer (outside rounded wrapper) -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 900px; width: 100%; margin: 0 auto;">
          <tr>
            <td style="padding: 32px 40px; background-color: #f1f5f9 !important;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                      <tr>
                        <td style="padding-right: 8px; vertical-align: middle;">
                          <table role="presentation" width="24" height="24" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 6px; -webkit-border-radius: 6px;">
                            <tr>
                              <td align="center" valign="middle" style="font-size: 12px; font-weight: 700; color: #ffffff !important;">R</td>
                            </tr>
                          </table>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 14px; font-weight: 600; color: #475569 !important;">RelevX</span>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top: 16px; font-size: 14px; color: #64748b !important; line-height: 1.6;">
                      Automated research intelligence, delivered to your inbox.
                    </div>
                    <div style="margin-top: 16px; font-size: 13px; color: #64748b !important; line-height: 1.5;">
                      Source references are available in the full report on your dashboard.
                    </div>
                    <div style="margin-top: 16px;">
                      <a href="https://relevx.ai/projects?project=${encodeURIComponent(projectTitle)}&tab=history" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); background-color: #0d9488 !important; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; -webkit-border-radius: 8px;">View Full Report &amp; Sources</a>
                    </div>
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                      <span style="font-size: 12px; color: #64748b !important;">
                        &copy; ${new Date().getFullYear()} RelevX. All rights reserved.
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send a research report via email
 */
export async function sendReportEmail(
  to: string,
  report: ClientReport,
  projectId: string,
  projectTitle: string,
  options?: ReportEmailOptions
): Promise<{ success: boolean; id?: string; error?: any }> {
  try {
    const resend = getResendClient();

    const htmlContent = await generateEmailHTML(report, projectId, projectTitle, options);

    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      throw new Error("RESEND_FROM_EMAIL is not set in environment variables");
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Research Report: ${report.title}`,
      html: htmlContent,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}
