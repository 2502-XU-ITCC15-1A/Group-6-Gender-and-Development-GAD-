import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    department: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    // Required: assigned at birth (used for department male/female tracking)
    birthSex: { type: String, required: true, trim: true },
    genderIdentity: { type: String },
    role: {
      type: String,
      enum: ['employee', 'admin'],
      default: 'employee',
    },
    seminarsAttended: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seminar',
      },
    ],
    // Used for compliance summaries/reminders (e.g., how many seminars required per year)
    requiredSeminarsPerYear: { type: Number, default: 5 },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

export default mongoose.model('Employee', EmployeeSchema);

