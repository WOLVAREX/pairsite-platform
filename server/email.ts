import { log } from "./index";

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
}

const BREVO_SENDER = {
  name: process.env.BREVO_SENDER_NAME || "PairSite",
  email: process.env.BREVO_SENDER_EMAIL || "noreply@pairsite.space",
};

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    log(`Email skipped (BREVO_API_KEY not set): "${opts.subject}" to ${opts.to}`, "email");
    return false;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: BREVO_SENDER,
        to: [{ email: opts.to }],
        subject: opts.subject,
        htmlContent: opts.htmlContent,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log(`Brevo send failed (${res.status}): ${body.slice(0, 300)}`, "email");
      return false;
    }
    return true;
  } catch (err: any) {
    log(`Brevo send error: ${err.message}`, "email");
    return false;
  }
}

export async function sendCloneAttemptEmails(params: {
  originalOwnerEmail?: string;
  notifyOriginalOwner: boolean;
  adminEmail?: string;
  notifyAdmin: boolean;
  attemptedRepoUrl: string;
  attemptedByEmail: string;
  originalSiteName: string;
}) {
  const {
    originalOwnerEmail,
    notifyOriginalOwner,
    adminEmail,
    notifyAdmin,
    attemptedRepoUrl,
    attemptedByEmail,
    originalSiteName,
  } = params;

  if (notifyOriginalOwner && originalOwnerEmail) {
    await sendEmail({
      to: originalOwnerEmail,
      subject: `Someone tried to register a fork of your bot "${originalSiteName}"`,
      htmlContent: `
        <p>Hi,</p>
        <p>An account (${attemptedByEmail}) tried to register a PairSite using a fork of your repository, tied to your bot <strong>${originalSiteName}</strong>.</p>
        <p>Attempted repo: ${attemptedRepoUrl}</p>
        <p>The request was automatically blocked. No action is needed unless you don't recognize this as legitimate activity.</p>
        <p>You can turn these alerts off from your account settings.</p>
      `,
    });
  }

  if (notifyAdmin && adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `Clone attempt blocked: ${attemptedRepoUrl}`,
      htmlContent: `
        <p>A site-creation request was blocked for attempting to register a fork of an already-registered bot.</p>
        <p>Attempted by: ${attemptedByEmail}</p>
        <p>Attempted repo: ${attemptedRepoUrl}</p>
        <p>Original bot: ${originalSiteName}</p>
      `,
    });
  }
}
