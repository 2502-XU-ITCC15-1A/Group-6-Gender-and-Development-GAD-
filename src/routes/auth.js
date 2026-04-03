import express from 'express';
import jwt from 'jsonwebtoken';

import PinVerification from '../models/PinVerification.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { sendVerificationPinEmail } from '../services/emailService.js';

const router = express.Router();

const EMAIL_DOMAINS = ['@xu.edu.ph', '@my.xu.edu.ph'];

const isValidXUEmail = (email) => {
  if (!email) return false;
  const trimmed = String(email).trim().toLowerCase();
  return EMAIL_DOMAINS.some((domain) => trimmed.endsWith(domain));
};

const generatePin = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

router.post('/send-pin', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'XU email is required.' });
    }
    if (!isValidXUEmail(email)) {
      return res
        .status(400)
        .json({ message: 'Only @xu.edu.ph or @my.xu.edu.ph emails are allowed.' });
    }

    const code = generatePin();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await PinVerification.create({
      email: email.toLowerCase().trim(),
      code,
      expiresAt,
    });

    await sendVerificationPinEmail(email, code, expiresAt);

    return res.json({ message: 'Verification PIN sent. Please check your email.' });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-pin', async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and PIN are required.' });
    }
    if (!isValidXUEmail(email)) {
      return res
        .status(400)
        .json({ message: 'Only @xu.edu.ph or @my.xu.edu.ph emails are allowed.' });
    }

    const now = new Date();
    const record = await PinVerification.findOne({
      email: email.toLowerCase().trim(),
      code: String(code).trim(),
      expiresAt: { $gt: now },
      usedAt: { $exists: false },
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired PIN.' });
    }

    record.usedAt = new Date();
    await record.save();

    const token = jwt.sign(
      {
        email: email.toLowerCase().trim(),
        scope: 'registration',
      },
      process.env.JWT_SECRET || 'gadims-secret',
      { expiresIn: '10m' }
    );

    return res.json({ token });
  } catch (err) {
    next(err);
  }
});

router.post('/create-account', async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) {
      return res.status(401).json({ message: 'Missing Authorization header' });
    }
    const token = header.replace('Bearer ', '');

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'gadims-secret');
    } catch {
      return res.status(401).json({ message: 'Invalid or expired registration token.' });
    }

    if (payload.scope !== 'registration' || !payload.email) {
      return res.status(403).json({ message: 'Invalid registration scope.' });
    }

    const { fullName, department, position, birthSex, genderIdentity, password } = req.body;

    if (!fullName || !department || !position || !birthSex || !password) {
      return res
        .status(400)
        .json({ message: 'Full Name, Department, Position, Birth Sex, and Password are required.' });
    }

    const existing = await Employee.findOne({ email: payload.email });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const employee = await Employee.create({
      name: fullName,
      email: payload.email,
      department,
      position,
      birthSex: String(birthSex || '').trim(),
      genderIdentity: genderIdentity || undefined,
      role: 'employee',
    });

    const user = new User({
      username: payload.email,
      role: 'employee',
      passwordHash: '',
      employee: employee._id,
    });
    await user.setPassword(password);
    await user.save();

    const sessionToken = jwt.sign(
      { id: employee._id, role: employee.role, email: employee.email },
      process.env.JWT_SECRET || 'gadims-secret',
      { expiresIn: '8h' }
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      employee,
      token: sessionToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ username: email.toLowerCase().trim() }).populate('employee');
    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const role = user.role;
    const employeeDoc = user.employee;

    // For employees we expect an attached employee document
    if (role === 'employee' && !employeeDoc) {
      return res.status(401).json({ message: 'Employee profile not found.' });
    }

    const id = employeeDoc?._id || user._id;

    const token = jwt.sign(
      { id, role, email: email.toLowerCase().trim() },
      process.env.JWT_SECRET || 'gadims-secret',
      { expiresIn: '8h' }
    );

    return res.json({ token, role });
  } catch (err) {
    next(err);
  }
});

export default router;

