import Employee from '../models/Employee.js';
import User from '../models/User.js';

const HARDCODED_ACCOUNTS = [
  {
    name: 'GIMS Admin',
    email: 'gad.admin@xu.edu.ph',
    password: 'GimsAdmin!123',
    department: 'GAD Office',
    position: 'Administrator',
    birthSex: 'Female',
  },
  {
    name: 'GAD Secretary',
    email: 'gad.secretary@xu.edu.ph',
    password: 'GimsSecretary!123',
    department: 'GAD Office',
    position: 'Secretary',
    birthSex: 'Female',
  },
];

const ensureAccount = async ({ name, email, password, department, position, birthSex }) => {
  const username = email.toLowerCase().trim();

  let employee = await Employee.findOne({ email: username });
  if (!employee) {
    employee = await Employee.create({
      name,
      email: username,
      department,
      position,
      birthSex,
      role: 'admin',
    });
  } else {
    let dirty = false;
    if (employee.role !== 'admin') { employee.role = 'admin'; dirty = true; }
    if (!employee.birthSex) { employee.birthSex = birthSex; dirty = true; }
    if (!employee.department) { employee.department = department; dirty = true; }
    if (!employee.position) { employee.position = position; dirty = true; }
    if (!employee.name) { employee.name = name; dirty = true; }
    if (dirty) await employee.save();
  }

  let user = await User.findOne({ username, role: 'admin' });
  if (!user) {
    user = new User({ username, role: 'admin', passwordHash: '', employee: employee._id });
    await user.setPassword(password);
    await user.save();
    return { email: username, created: true };
  }

  if (!user.employee || String(user.employee) !== String(employee._id)) {
    user.employee = employee._id;
    await user.save();
  }
  return { email: username, created: false };
};

export const bootstrapHardcodedAdmins = async () => {
  for (const acct of HARDCODED_ACCOUNTS) {
    try {
      const result = await ensureAccount(acct);
      console.log(
        `Bootstrap admin: ${result.email} (${result.created ? 'created' : 'already exists'})`
      );
    } catch (err) {
      console.error(`Bootstrap admin failed for ${acct.email}:`, err.message);
    }
  }
};
