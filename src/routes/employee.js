import express from 'express';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer';

import Employee from '../models/Employee.js';
import Seminar from '../models/Seminar.js';
import Registration from '../models/Registration.js';
import Notification from '../models/Notification.js';
import Evaluation from '../models/Evaluation.js';
import LearningMaterial from '../models/LearningMaterial.js';
import Article from '../models/Article.js';
import { issueCertificateForRegistration } from '../services/certificateService.js';

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing Authorization header' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'gadims-secret');
    if (payload.role !== 'employee') return res.status(403).json({ message: 'Forbidden' });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const makeEmployeeDisplayId = (id) => {
  const tail = String(id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return `EMP-${tail || '000000'}`;
};

const escapeHtml = (value) => {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const buildCertificateHtml = ({
  employeeName,
  seminarTitle,
  dateStr,
  startTime,
  certificateCode,
  employeeDisplayId,
  department,
  issuedStr,
}) => {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GADIMS Certificate - ${escapeHtml(employeeName)}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        padding: 20px;
        background: #f6f8fb;
        font-family: Arial, sans-serif;
        width: 100vw;
        height: 100vh;
        box-sizing: border-box;
      }
      .certificate {
        width: 100%;
        height: 100%;
        margin: 0 auto;
        background: #ffffff;
        border: 12px solid #1f3c77;
        border-radius: 20px;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
        padding: 40px 52px 36px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .watermark {
        position: absolute;
        right: 16px;
        bottom: -12px;
        font-size: 140px;
        color: rgba(31, 60, 119, 0.06);
        font-weight: 800;
        letter-spacing: 0.08em;
        user-select: none;
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #dbe5f7;
        padding-bottom: 14px;
      }
      .org {
        font-size: 13px;
        letter-spacing: 0.12em;
        color: #334155;
      }
      .title {
        margin-top: 6px;
        font-size: 54px;
        line-height: 1.1;
        color: #1f3c77;
        font-weight: 800;
      }
      .subtitle {
        margin-top: 6px;
        color: #475569;
        font-size: 20px;
      }
      .name {
        margin-top: 34px;
        text-align: center;
        font-size: 62px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.2;
      }
      .line {
        margin: 10px auto 24px;
        width: min(820px, 90%);
        border-bottom: 2px solid #cbd5e1;
      }
      .body-text {
        text-align: center;
        margin: 0 auto;
        max-width: 1180px;
        color: #334155;
        font-size: 32px;
        line-height: 1.5;
      }
      .seminar {
        color: #1f3c77;
        font-weight: 700;
      }
      .meta {
        margin-top: auto;
        padding-top: 30px;
        display: grid;
        grid-template-columns: repeat(2, minmax(320px, 1fr));
        gap: 10px 40px;
        font-size: 20px;
        color: #334155;
      }
      .meta b { color: #0f172a; }
      .footer {
        margin-top: 28px;
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 22px;
      }
      .sig {
        border-top: 1px solid #94a3b8;
        width: 320px;
        text-align: center;
        padding-top: 10px;
        font-size: 18px;
        color: #334155;
      }
      .badge {
        background: #eaf0fb;
        color: #1f3c77;
        border: 1px solid #c9d8f3;
        border-radius: 999px;
        padding: 12px 18px;
        font-size: 17px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <article class="certificate">
      <div class="watermark">GADIMS</div>
      <header class="header">
        <div class="org">XAVIER UNIVERSITY - ATENEO DE CAGAYAN</div>
        <div class="title">Certificate of Attendance</div>
        <div class="subtitle">Gender and Development Information and Management System</div>
      </header>

      <div class="name">${escapeHtml(employeeName)}</div>
      <div class="line"></div>

      <p class="body-text">
        is hereby recognized for attending the seminar
        <span class="seminar">${escapeHtml(seminarTitle)}</span>
        held on <span class="seminar">${escapeHtml(dateStr)}</span>
        at <span class="seminar">${escapeHtml(startTime)}</span>.
      </p>

      <section class="meta">
        <div><b>Certificate Code:</b> ${escapeHtml(certificateCode)}</div>
        <div><b>Employee ID:</b> ${escapeHtml(employeeDisplayId)}</div>
        <div><b>Department:</b> ${escapeHtml(department || 'N/A')}</div>
        <div><b>Issued At:</b> ${escapeHtml(issuedStr)}</div>
      </section>

      <footer class="footer">
        <div class="sig">GAD Office Representative</div>
        <div class="badge">System-Issued via GADIMS</div>
      </footer>
    </article>
  </body>
</html>`;
};

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const required = Number(employee.requiredSeminarsPerYear || 5);
    const completed = Array.isArray(employee.seminarsAttended) ? employee.seminarsAttended.length : 0;
    const progressPercent = required === 0 ? 0 : Math.min(100, (completed / required) * 100);
    const compliant = completed >= required;

    const dept = employee.department;
    const maleCount = await Employee.countDocuments({
      department: dept,
      birthSex: { $regex: /male/i },
    });
    const femaleCount = await Employee.countDocuments({
      department: dept,
      birthSex: { $regex: /female/i },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const seminars = await Seminar.find({ date: { $gte: today } })
      .sort({ date: 1, startTime: 1 })
      .populate('createdBy', 'name');

    const upcomingSeminars = seminars.map((s) => {
      const remaining = Math.max(0, (s.capacity || 0) - (Array.isArray(s.registeredEmployees) ? s.registeredEmployees.length : 0));
      return {
        id: s._id.toString(),
        title: s.title,
        description: s.description,
        date: s.date,
        startTime: s.startTime,
        durationHours: s.durationHours,
        mandatory: s.mandatory,
        capacity: s.capacity,
        remainingCapacity: remaining,
        instructorName: s.createdBy?.name || 'GAD Office',
      };
    });

    // Certificates (attended + certificate issued)
    const certificates = await Registration.find({
      employeeID: req.user.id,
      status: 'attended',
      certificateIssued: true,
    })
      .populate({
        path: 'seminarID',
        select: 'title description date startTime durationHours mandatory',
      })
      .sort({ registeredAt: -1 });

    const certificatesView = certificates.map((r) => ({
      registrationId: r._id.toString(),
      certificateCode: r.certificateCode || '',
      certificateIssuedAt: r.certificateIssuedAt || r.updatedAt || null,
      seminar: {
        id: r.seminarID?._id?.toString() || '',
        title: r.seminarID?.title || '',
        date: r.seminarID?.date,
        startTime: r.seminarID?.startTime,
      },
    }));

    // All registrations for this employee (to build different views)
    const allRegistrations = await Registration.find({ employeeID: req.user.id })
      .populate({
        path: 'seminarID',
        select: 'title description date startTime durationHours mandatory capacity registeredEmployees',
      })
      .sort({ registeredAt: -1 });

    // Pre-registered seminars
    const preRegistered = allRegistrations
      .filter((r) => r.status === 'pre-registered' && r.seminarID)
      .map((r) => ({
        registrationId: r._id.toString(),
        status: r.status,
        seminar: {
          id: r.seminarID._id.toString(),
          title: r.seminarID.title,
          description: r.seminarID.description,
          date: r.seminarID.date,
          startTime: r.seminarID.startTime,
          durationHours: r.seminarID.durationHours,
          mandatory: r.seminarID.mandatory,
        },
      }));

    // Attended seminars view (with cert and eval info)
    const attendedSeminars = allRegistrations
      .filter((r) => r.status === 'attended' && r.seminarID)
      .map((r) => ({
        registrationId: r._id.toString(),
        status: r.status,
        certificateIssued: r.certificateIssued,
        certificateCode: r.certificateCode || '',
        evaluationAvailable: r.evaluationAvailable,
        evaluationCompleted: r.evaluationCompleted,
        seminar: {
          id: r.seminarID._id.toString(),
          title: r.seminarID.title,
          description: r.seminarID.description,
          date: r.seminarID.date,
          startTime: r.seminarID.startTime,
          durationHours: r.seminarID.durationHours,
          mandatory: r.seminarID.mandatory,
        },
      }));

    res.json({
      profile: {
        employeeId: makeEmployeeDisplayId(employee._id),
        name: employee.name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        birthSex: employee.birthSex,
        genderIdentity: employee.genderIdentity || null,
        accountStatus: 'Active',
        departmentGenderCounts: {
          male: maleCount,
          female: femaleCount,
        },
      },
      compliance: {
        requiredSeminars: required,
        completedSeminars: completed,
        progressPercent: Number(progressPercent.toFixed(1)),
        compliant,
        statusLabel: compliant ? 'Compliant' : 'Incomplete',
      },
      upcomingSeminars,
      certificates: certificatesView,
      preRegistered,
      attendedSeminars,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/certificates/:registrationId/download', authMiddleware, async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      employeeID: req.user.id,
      status: 'attended',
      certificateIssued: true,
    }).populate('seminarID', 'title date startTime durationHours');

    if (!registration || !registration.seminarID) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const seminarTitle = registration.seminarID.title;
    const dateStr = registration.seminarID.date ? new Date(registration.seminarID.date).toLocaleDateString() : '';
    const fileNameSafe = `${seminarTitle}`.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 60);
    const issuedAt = registration.certificateIssuedAt
      ? new Date(registration.certificateIssuedAt)
      : new Date();
    const issuedStr = issuedAt.toLocaleString();
    const certificateCode = registration.certificateCode || `CERT-${registration._id.toString().slice(-8).toUpperCase()}`;
    const employeeDisplayId = makeEmployeeDisplayId(employee._id);

    const html = buildCertificateHtml({
      employeeName: employee.name,
      seminarTitle,
      dateStr,
      startTime: registration.seminarID.startTime || '',
      certificateCode,
      employeeDisplayId,
      department: employee.department,
      issuedStr,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    let pngBuffer;
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1754, height: 1240, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      pngBuffer = await page.screenshot({
        type: 'png',
        fullPage: false,
      });
    } finally {
      await browser.close();
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="GADIMS-Certificate-${fileNameSafe}-${employeeDisplayId}.png"`
    );
    res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
});

router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const updates = {
      birthSex: req.body.birthSex,
      genderIdentity: req.body.genderIdentity,
    };
    const employee = await Employee.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

router.get('/seminars', authMiddleware, async (req, res, next) => {
  try {
    const seminars = await Seminar.find().sort({ date: 1, startTime: 1 });
    res.json(seminars);
  } catch (err) {
    next(err);
  }
});

// Pre-register for a seminar
router.post('/seminars/:id/register', authMiddleware, async (req, res, next) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) {
      return res.status(404).json({ message: 'Seminar not found' });
    }

    const employeeId = req.user.id;

    // Check if already registered in any state
    const existing = await Registration.findOne({ seminarID: seminar._id, employeeID: employeeId });
    if (existing) {
      if (existing.status === 'pre-registered') {
        return res.status(400).json({ message: 'You have already pre-registered for this seminar. Awaiting approval.' });
      }
      return res.status(400).json({ message: 'You are already registered for this seminar.' });
    }

    if (seminar.registeredEmployees.length >= seminar.capacity) {
      return res.status(400).json({ message: 'Registration Full' });
    }

    seminar.registeredEmployees.push(employeeId);
    await seminar.save();

    await Registration.create({
      seminarID: seminar._id,
      employeeID: employeeId,
      status: 'pre-registered',
    });

    res.json({ message: 'You have successfully pre-registered for this seminar. Your registration is pending approval by the GAD Admin.' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You are already registered for this seminar.' });
    }
    next(err);
  }
});

// Get notifications for current employee
router.get('/notifications', authMiddleware, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ employeeID: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = notifications.filter((n) => !n.read).length;

    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// Mark a notification as read
router.put('/notifications/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, employeeID: req.user.id },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authMiddleware, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { employeeID: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// Get evaluation form status for a registration
router.get('/registrations/:registrationId/evaluation', authMiddleware, async (req, res, next) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      employeeID: req.user.id,
    }).populate('seminarID', 'title date startTime');

    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    const existing = await Evaluation.findOne({
      registrationID: registration._id,
      employeeID: req.user.id,
    });

    res.json({
      available: Boolean(registration.evaluationAvailable),
      completed: Boolean(registration.evaluationCompleted),
      seminar: registration.seminarID
        ? {
            id: registration.seminarID._id.toString(),
            title: registration.seminarID.title,
            date: registration.seminarID.date,
            startTime: registration.seminarID.startTime,
          }
        : null,
      evaluation: existing || null,
    });
  } catch (err) {
    next(err);
  }
});

// Submit evaluation form
router.post('/registrations/:registrationId/evaluation', authMiddleware, async (req, res, next) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      employeeID: req.user.id,
      status: 'attended',
      evaluationAvailable: true,
    }).populate('seminarID', 'title certificateReleaseMode autoSendCertificates');

    if (!registration) {
      return res.status(404).json({ message: 'Evaluation not available for this registration.' });
    }
    if (registration.evaluationCompleted) {
      return res.status(400).json({ message: 'You have already submitted an evaluation for this seminar.' });
    }

    const { rating, feedback, wouldRecommend } = req.body;
    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    const evaluation = await Evaluation.create({
      registrationID: registration._id,
      seminarID: registration.seminarID,
      employeeID: req.user.id,
      rating: Number(rating),
      feedback: String(feedback || '').trim(),
      wouldRecommend: wouldRecommend !== false && wouldRecommend !== 'false',
      submittedAt: new Date(),
    });

    registration.evaluationCompleted = true;
    await registration.save();

    if (registration.seminarID?.certificateReleaseMode !== 'manual') {
      const employee = await Employee.findById(req.user.id);
      if (employee) {
        await issueCertificateForRegistration({
          registration,
          seminar: registration.seminarID,
          employee,
          Notification,
        });
      }
    }

    res.status(201).json({ message: 'Evaluation submitted successfully.', evaluation });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already submitted an evaluation for this seminar.' });
    }
    next(err);
  }
});

router.get('/materials', authMiddleware, async (req, res, next) => {
  try {
    const materials = await LearningMaterial.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    next(err);
  }
});

router.get('/registrations', authMiddleware, async (req, res, next) => {
  try {
    const regs = await Registration.find({ employeeID: req.user.id })
      .populate('seminarID')
      .sort({ registeredAt: -1 });
    res.json(regs);
  } catch (err) {
    next(err);
  }
});

router.get('/articles', authMiddleware, async (req, res, next) => {
  try {
    const articles = await Article.find({ published: true })
      .select('title excerpt imageUrl publishedAt seminar')
      .populate('seminar')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(20);
    res.json(articles);
  } catch (err) {
    next(err);
  }
});

router.get('/articles/:id', authMiddleware, async (req, res, next) => {
  try {
    const article = await Article.findOne({ _id: req.params.id, published: true }).populate('seminar');
    if (!article) return res.status(404).json({ message: 'Not found' });
    res.json(article);
  } catch (err) {
    next(err);
  }
});

export default router;
