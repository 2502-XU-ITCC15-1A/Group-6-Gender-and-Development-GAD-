import mongoose from 'mongoose';

const RegistrationArchiveSchema = new mongoose.Schema(
  {
    schoolYear: { type: String, required: true, index: true },
    archivedAt: { type: Date, default: Date.now },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    // Original Registration document fields (snapshotted)
    originalRegistrationId: { type: mongoose.Schema.Types.ObjectId },
    seminarID: { type: mongoose.Schema.Types.ObjectId },
    employeeID: { type: mongoose.Schema.Types.ObjectId, index: true },
    registeredAt: { type: Date },
    status: { type: String },
    certificateIssued: { type: Boolean, default: false },
    certificateIssuedAt: { type: Date },
    certificateCode: { type: String },
    evaluationAvailable: { type: Boolean, default: false },
    evaluationCompleted: { type: Boolean, default: false },
    sessionAttendance: [
      {
        sessionId: { type: mongoose.Schema.Types.ObjectId },
        attended: { type: Boolean, default: false },
        markedAt: { type: Date },
      },
    ],
    chosenSessionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    originalCreatedAt: { type: Date },
    originalUpdatedAt: { type: Date },

    // Snapshots so the archive is self-contained even if the seminar
    // or employee is later renamed/removed.
    seminarSnapshot: {
      title: String,
      description: String,
      location: String,
      date: Date,
      durationHours: Number,
    },
    employeeSnapshot: {
      name: String,
      email: String,
      department: String,
      position: String,
    },
  },
  { timestamps: true }
);

RegistrationArchiveSchema.index({ schoolYear: 1, employeeID: 1 });

export default mongoose.model('RegistrationArchive', RegistrationArchiveSchema);
