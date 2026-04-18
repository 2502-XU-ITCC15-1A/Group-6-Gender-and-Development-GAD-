import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    seminar: { type: mongoose.Schema.Types.ObjectId, ref: 'Seminar', required: true },
    attendedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['google_sheets', 'manual'], default: 'google_sheets' },
    rawRowId: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ employee: 1, seminar: 1 }, { unique: true });

export default mongoose.model('Attendance', AttendanceSchema);

