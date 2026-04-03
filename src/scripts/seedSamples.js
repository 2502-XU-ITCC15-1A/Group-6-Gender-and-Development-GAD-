import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Seminar from '../models/Seminar.js';
import Registration from '../models/Registration.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    // Sample employee
    const employeeEmail = 'juan.delacruz@xu.edu.ph';
    const employeePassword = 'GadimsEmp!123';
    const mariaEmail = 'maria.santos@xu.edu.ph';
    const mariaPassword = 'GadimsMaria!123';

    let emp = await Employee.findOne({ email: employeeEmail.toLowerCase() });
    if (!emp) {
      emp = await Employee.create({
        name: 'Juan Dela Cruz',
        email: employeeEmail.toLowerCase(),
        department: 'IT Office',
        position: 'Systems Analyst',
        role: 'employee',
        birthSex: 'Male',
        genderIdentity: 'Man',
      });
      console.log('Created sample employee:', emp.email);
    } else {
      console.log('Sample employee already exists:', emp.email);
      // Ensure required fields exist for the new schema
      if (!emp.birthSex) emp.birthSex = 'Male';
      if (emp.genderIdentity === undefined) emp.genderIdentity = 'Man';
      await emp.save();
    }

    let empUser = await User.findOne({ username: employeeEmail.toLowerCase(), role: 'employee' });
    if (!empUser) {
      empUser = new User({
        username: employeeEmail.toLowerCase(),
        role: 'employee',
        passwordHash: '',
        employee: emp._id,
      });
      await empUser.setPassword(employeePassword);
      await empUser.save();
      console.log('Created employee user account for:', empUser.username);
    } else {
      console.log('Employee user account already exists for:', empUser.username);
    }

    // Sample employee (Maria Santos for dashboard QA)
    let mariaEmp = await Employee.findOne({ email: mariaEmail.toLowerCase() });
    if (!mariaEmp) {
      mariaEmp = await Employee.create({
        name: 'Maria Santos',
        email: mariaEmail.toLowerCase(),
        department: 'College of Engineering',
        position: 'Student Coordinator',
        role: 'employee',
        birthSex: 'Female',
        genderIdentity: 'Woman',
        requiredSeminarsPerYear: 5,
        seminarsAttended: [],
      });
      console.log('Created sample employee:', mariaEmp.email);
    } else {
      if (!mariaEmp.birthSex) mariaEmp.birthSex = 'Female';
      if (mariaEmp.genderIdentity === undefined) mariaEmp.genderIdentity = 'Woman';
      if (mariaEmp.requiredSeminarsPerYear == null) mariaEmp.requiredSeminarsPerYear = 5;
      mariaEmp.department = mariaEmp.department || 'College of Engineering';
      mariaEmp.position = mariaEmp.position || 'Student Coordinator';
      mariaEmp.seminarsAttended = Array.isArray(mariaEmp.seminarsAttended) ? mariaEmp.seminarsAttended : [];
      await mariaEmp.save();
      console.log('Sample employee already exists:', mariaEmp.email);
    }

    let mariaUser = await User.findOne({ username: mariaEmail.toLowerCase(), role: 'employee' });
    if (!mariaUser) {
      mariaUser = new User({
        username: mariaEmail.toLowerCase(),
        role: 'employee',
        passwordHash: '',
        employee: mariaEmp._id,
      });
      await mariaUser.setPassword(mariaPassword);
      await mariaUser.save();
      console.log('Created Maria employee user account for:', mariaUser.username);
    } else {
      console.log('Maria user account already exists for:', mariaUser.username);
    }

    // Extra employee to make department gender counts realistic
    // (no user account needed for the dashboard gender aggregation)
    const extraMaleEmail = 'peter.tan@xu.edu.ph';
    let extraMaleEmp = await Employee.findOne({ email: extraMaleEmail.toLowerCase() });
    if (!extraMaleEmp) {
      extraMaleEmp = await Employee.create({
        name: 'Peter Tan',
        email: extraMaleEmail.toLowerCase(),
        department: 'College of Engineering',
        position: 'Student Assistant',
        role: 'employee',
        birthSex: 'Male',
      });
      console.log('Created extra male employee for department counts:', extraMaleEmp.email);
    } else if (!extraMaleEmp.birthSex) {
      extraMaleEmp.birthSex = 'Male';
      await extraMaleEmp.save();
    }

    // Sample admin
    const adminEmail = 'gad.admin@xu.edu.ph';
    const adminPassword = 'GadimsAdmin!123';

    let adminEmp = await Employee.findOne({ email: adminEmail.toLowerCase() });
    if (!adminEmp) {
      adminEmp = await Employee.create({
        name: 'GADIMS Admin',
        email: adminEmail.toLowerCase(),
        department: 'GAD Office',
        position: 'Administrator',
        role: 'admin',
        birthSex: 'Female',
      });
      console.log('Created sample admin employee:', adminEmp.email);
    } else {
      adminEmp.role = 'admin';
      if (!adminEmp.birthSex) adminEmp.birthSex = 'Female';
      await adminEmp.save();
      console.log('Updated existing employee to admin:', adminEmp.email);
    }

    let adminUser = await User.findOne({
      username: adminEmail.toLowerCase(),
      role: 'admin',
    });
    if (!adminUser) {
      adminUser = new User({
        username: adminEmail.toLowerCase(),
        role: 'admin',
        passwordHash: '',
        employee: adminEmp._id,
      });
      await adminUser.setPassword(adminPassword);
      await adminUser.save();
      console.log('Created admin user account for:', adminUser.username);
    } else {
      console.log('Admin user account already exists for:', adminUser.username);
    }

    // Sample seminars + registrations for the sample employee
    // (so the dashboard has "Upcoming Seminars" + "Completed Certificates" content)
    const adminId = adminEmp._id;
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 7);

    const upcomingSeminars = [
      {
        title: 'Advanced Gender Mainstreaming in Education',
        description:
          'This seminar focuses on integrating gender perspectives in curriculum development and teaching strategies, equipping participants with practical tools for inclusive practices in the workplace.',
        offsetDays: 7,
        startTime: '09:00',
        durationHours: 2.5,
        mandatory: true,
        capacity: 60,
      },
      {
        title: 'Workplace Diversity and Inclusion Best Practices',
        description:
          'Learn practical strategies for creating inclusive workplace environments and developing programs that promote equity, belonging, and respect among employees.',
        offsetDays: 14,
        startTime: '10:00',
        durationHours: 2,
        mandatory: false,
        capacity: 60,
      },
      {
        title: 'Gender-Based Violence Prevention and Response',
        description:
          'Understand legal frameworks and institutional responses to gender-based violence and learn reporting and referral processes for safer workplaces.',
        offsetDays: 21,
        startTime: '13:30',
        durationHours: 2,
        mandatory: false,
        capacity: 60,
      },
    ];

    const attendedSeminarTitles = new Set([
      'Gender Sensitivity and Awareness Training',
      'Sexual Harassment Prevention Workshop',
    ]);
    const certificatesSeminars = [
      {
        title: 'Gender Sensitivity and Awareness Training',
        description: 'Training on recognizing bias and promoting inclusive communication.',
        offsetDays: -20,
        startTime: '08:00',
        durationHours: 2,
        mandatory: true,
        capacity: 60,
      },
      {
        title: 'Sexual Harassment Prevention Workshop',
        description: 'Workshop on prevention, reporting, and response mechanisms.',
        offsetDays: -40,
        startTime: '09:00',
        durationHours: 2,
        mandatory: true,
        capacity: 60,
      },
      {
        title: 'Women’s Rights and Empowerment Seminar',
        description: 'Seminar on rights, advocacy, and empowerment approaches.',
        offsetDays: -60,
        startTime: '10:00',
        durationHours: 2,
        mandatory: false,
        capacity: 60,
      },
      {
        title: 'LGBTQ+ Inclusion and Diversity Training',
        description: 'Training on inclusive practices and supporting LGBTQ+ employees and students.',
        offsetDays: -80,
        startTime: '11:00',
        durationHours: 2,
        mandatory: false,
        capacity: 60,
      },
      {
        title: 'Gender-Responsive Leadership Development',
        description: 'Leadership training for gender-responsive decision-making and inclusive governance.',
        offsetDays: -100,
        startTime: '13:00',
        durationHours: 2,
        mandatory: false,
        capacity: 60,
      },
    ];

    const upsertSeminar = async (s) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + s.offsetDays);
      let seminar = await Seminar.findOne({ title: s.title });
      if (!seminar) {
        seminar = await Seminar.create({
          title: s.title,
          description: s.description,
          date,
          startTime: s.startTime,
          durationHours: s.durationHours,
          mandatory: s.mandatory,
          capacity: s.capacity,
          registeredEmployees: [],
          createdBy: adminId,
        });
      } else {
        seminar.description = s.description;
        seminar.date = date;
        seminar.startTime = s.startTime;
        seminar.durationHours = s.durationHours;
        seminar.mandatory = s.mandatory;
        seminar.capacity = s.capacity;
        if (!seminar.createdBy) seminar.createdBy = adminId;
        await seminar.save();
      }
      return seminar;
    };

    const createOrUpdateRegistration = async ({ employeeDoc, seminar, status }) => {
      // Maintain the seminar registeredEmployees list for capacity correctness
      const empId = employeeDoc._id;
      const alreadyRegistered = (seminar.registeredEmployees || []).some((x) => String(x) === String(empId));
      if (!alreadyRegistered) {
        seminar.registeredEmployees = seminar.registeredEmployees || [];
        seminar.registeredEmployees.push(empId);
        await seminar.save();
      }

      let reg = await Registration.findOne({ seminarID: seminar._id, employeeID: empId });
      if (!reg) {
        reg = await Registration.create({
          seminarID: seminar._id,
          employeeID: empId,
          status,
        });
      } else {
        reg.status = status;
        await reg.save();
      }

      // If attended, ensure employee.seminarsAttended contains this seminar
      if (status === 'attended') {
        if (!Array.isArray(employeeDoc.seminarsAttended)) employeeDoc.seminarsAttended = [];
        const has = employeeDoc.seminarsAttended.some((x) => String(x) === String(seminar._id));
        if (!has) {
          employeeDoc.seminarsAttended.push(seminar._id);
          await employeeDoc.save();
        }
      }
    };

    // Upcoming + registered
    for (const s of upcomingSeminars) {
      const seminar = await upsertSeminar(s);
      await createOrUpdateRegistration({ employeeDoc: emp, seminar, status: 'registered' });
    }

    // Past + attended
    for (const s of certificatesSeminars) {
      const seminar = await upsertSeminar(s);
      const status = attendedSeminarTitles.has(s.title) ? 'attended' : 'registered';
      await createOrUpdateRegistration({ employeeDoc: emp, seminar, status });
    }

    // Past + attended for Maria (to match the 5 completed certificates in the Figma)
    for (const s of certificatesSeminars) {
      const seminar = await upsertSeminar(s);
      await createOrUpdateRegistration({ employeeDoc: mariaEmp, seminar, status: 'attended' });
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed sample accounts:', err);
    process.exit(1);
  }
};

run();

