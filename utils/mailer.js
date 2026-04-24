"use strict";

const nodemailer = require("nodemailer");
const config     = require("../config");

// Returns null if email is not configured — notifications are silently skipped
function createTransport() {
  if (!config.SMTP_USER || !config.SMTP_PASS || !config.NOTIFY_EMAIL) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });
}

/**
 * Send upload notification (fire-and-forget — never throws).
 * @param {{ originalName: string, rowCount: number, uploadedBy: string }} info
 */
async function notifyUpload({ originalName, rowCount, uploadedBy }) {
  const transport = createTransport();
  if (!transport) return;

  const now = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });

  try {
    await transport.sendMail({
      from:    `"Arkia APIS" <${config.SMTP_USER}>`,
      to:      config.NOTIFY_EMAIL,
      subject: `📋 קובץ נוסעים הועלה — ${originalName}`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px">
          <h2 style="color:#ED5530">קובץ נוסעים חדש הועלה</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;color:#666">קובץ</td>
                <td style="padding:8px;font-weight:bold">${originalName}</td></tr>
            <tr style="background:#f9f9f9">
                <td style="padding:8px;color:#666">נוסעים</td>
                <td style="padding:8px;font-weight:bold">${rowCount}</td></tr>
            <tr><td style="padding:8px;color:#666">הועלה על ידי</td>
                <td style="padding:8px;font-weight:bold">${uploadedBy}</td></tr>
            <tr style="background:#f9f9f9">
                <td style="padding:8px;color:#666">זמן</td>
                <td style="padding:8px">${now}</td></tr>
          </table>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email notification failed:", err.message);
  }
}

module.exports = { notifyUpload };
