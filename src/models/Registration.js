import mongoose from 'mongoose';
import { currentSchoolYear } from '../services/schoolYearService.js';

const RegistrationSchema = new mongoose.Schema(
  {
    seminarID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seminar',
      required: true,
    },
    employeeID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pre-registered', 'registered', 'attended', 'absent'],
      default: 'pre-registered',
    },
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    certificateIssuedAt: {
      type: Date,
    },
    certificateCode: {
      type: String,
      trim: true,
    },
    evaluationAvailable: {
      type: Boolean,
      default: false,
    },
    evaluationCompleted: {
      type: Boolean,
      default: false,
    },
    sessionAttendance: [
      {
        sessionId: { type: mongoose.Schema.Types.ObjectId },
        attended: { type: Boolean, default: false },
        markedAt: { type: Date },
      },
    ],
    chosenSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    schoolYear: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    reminderTargetDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

RegistrationSchema.index({ seminarID: 1, employeeID: 1 }, { unique: true });
RegistrationSchema.index({ employeeID: 1, status: 1, certificateIssued: 1 });
RegistrationSchema.index({ status: 1 });

RegistrationSchema.pre('validate', function autoSchoolYear(next) {
  if (!this.schoolYear) {
    this.schoolYear = currentSchoolYear();
  }
  next();
});

export default mongoose.model('Registration', RegistrationSchema);

