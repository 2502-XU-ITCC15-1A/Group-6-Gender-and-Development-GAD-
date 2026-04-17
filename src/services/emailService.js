import nodemailer from 'nodemailer';
import Employee from '../models/Employee.js';

let transporterPromise = null;

const createTransporter = async () => {
  const user = String(process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.GMAIL_APP_PASSWORD || '').trim();
  const hasPlaceholderUser = /^your-.*@example\.com$/i.test(user);
  const hasPlaceholderPass = /^your-.*$/i.test(pass);

  if (!user || !pass || hasPlaceholderUser || hasPlaceholderPass) {
    throw new Error(
      'Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env using a real Gmail address and a 16-character App Password.'
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  await transporter.verify();
  return transporter;
};

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((err) => {
      transporterPromise = null;
      throw err;
    });
  }
  return transporterPromise;
};

const sendMailWithRetry = async (mailOptions) => {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const transporter = await getTransporter();
      await transporter.sendMail(mailOptions);
      return;
    } catch (err) {
      lastError = err;
      transporterPromise = null;
    }
  }

  throw lastError;
};

export const sendVerificationPinEmail = async (email, code, expiresAt) => {
  const mailOptions = {
    from: `"GADIMS" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'GADIMS Account Verification',
    text: `Your verification PIN is: ${code}

This code will expire in 5 minutes (until ${expiresAt.toLocaleTimeString()}).
`,
  };

  await sendMailWithRetry(mailOptions);
};

export const sendPasswordResetPinEmail = async (email, code, expiresAt) => {
  const mailOptions = {
    from: `"GADIMS" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'GADIMS Password Reset PIN',
    text: `A password reset was requested for your GADIMS account.

Your verification PIN is: ${code}

This code will expire in 10 minutes (until ${expiresAt.toLocaleTimeString()}).

If you did not request this, you can ignore this message.`,
  };

  await sendMailWithRetry(mailOptions);
};

export const sendTemporaryPasswordEmail = async (email, tempPassword) => {
  const mailOptions = {
    from: `"GADIMS" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'GADIMS Temporary Password Reset',
    text: `Your GADIMS password has been reset by an administrator.

Temporary password: ${tempPassword}

Please sign in and change it as soon as possible.`,
  };

  await sendMailWithRetry(mailOptions);
};

export const sendReminderEmail = async (employee, remainingCount) => {
  const mailOptions = {
    from: `"XU GAD Office" <${process.env.GMAIL_USER}>`,
    to: employee.email,
    subject: 'GAD Seminar Compliance Reminder',
    text: `Dear ${employee.name},

Our records show that you have remaining GAD seminars to complete for the current academic year.

You still need ${remainingCount} seminar(s) to complete your requirements.

Please refer to the upcoming GAD seminar schedule and ensure your participation.

Thank you,
Xavier University GAD Office`,
  };

  await sendMailWithRetry(mailOptions);
};

export const sendBulkReminders = async () => {
  const employees = await Employee.find();
  let sent = 0;

  for (const employee of employees) {
    const required = Number(employee.requiredSeminarsPerYear || 5);
    const completed = Array.isArray(employee.seminarsAttended) ? employee.seminarsAttended.length : 0;
    const remaining = required - completed;
    if (remaining > 0) {
      try {
        await sendReminderEmail(employee, remaining);
        sent += 1;
      } catch (err) {
        console.error(`Failed to email ${employee.email}`, err.message);
      }
    }
  }

  return { sent };
};

