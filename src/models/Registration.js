import mongoose from 'mongoose';

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
      enum: ['registered', 'attended', 'absent'],
      default: 'registered',
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
  },
  {
    timestamps: true,
  }
);

RegistrationSchema.index({ seminarID: 1, employeeID: 1 }, { unique: true });

export default mongoose.model('Registration', RegistrationSchema);

