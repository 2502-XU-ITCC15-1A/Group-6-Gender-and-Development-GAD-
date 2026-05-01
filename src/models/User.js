import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { validatePasswordPolicy } from '../config/passwordPolicy.js';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'employee'], required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

UserSchema.methods.setPassword = async function setPassword(password) {
  const policyError = validatePasswordPolicy(password);
  if (policyError) {
    const err = new Error(policyError);
    err.status = 400;
    throw err;
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

UserSchema.methods.validatePassword = async function validatePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model('User', UserSchema);

