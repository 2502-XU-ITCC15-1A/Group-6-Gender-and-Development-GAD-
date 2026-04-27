import nodemailer from 'nodemailer';
import Employee from '../models/Employee.js';
import Seminar from '../models/Seminar.js';

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
    from: `"GIMS" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'GIMS Account Verification',
    text: `Your verification PIN is: ${code}

This code will expire in 5 minutes (until ${expiresAt.toLocaleTimeString()}).
`,
  };

  await sendMailWithRetry(mailOptions);
};

export const sendPasswordResetPinEmail = async (email, code, expiresAt) => {
  const mailOptions = {
    from: `"GIMS" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'GIMS Password Reset PIN',
    text: `A password reset was requested for your GIMS account.

Your verification PIN is: ${code}

This code will expire in 10 minutes (until ${expiresAt.toLocaleTimeString()}).

If you did not request this, you can ignore this message.`,
  };

  await sendMailWithRetry(mailOptions);
};

export const sendTemporaryPasswordEmail = async (email, tempPassword) => {
  const mailOptions = {
    from: `"GIMS" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'GIMS Temporary Password Reset',
    text: `Your GIMS password has been reset by an administrator.

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
  const activeSeminars = await Seminar.find({ isDeleted: { $ne: true } }).select('_id').lean();
  const activeSeminarIdSet = new Set(activeSeminars.map((s) => String(s._id)));

  const countActiveAttended = (seminarIds) => {
    if (!Array.isArray(seminarIds) || seminarIds.length === 0) return 0;
    const unique = new Set(seminarIds.map((id) => String(id)));
    let count = 0;
    unique.forEach((id) => {
      if (activeSeminarIdSet.has(id)) count += 1;
    });
    return count;
  };

  let sent = 0;

  for (const employee of employees) {
    const required = Number(employee.requiredSeminarsPerYear || 5);
    const completed = countActiveAttended(employee.seminarsAttended);
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

