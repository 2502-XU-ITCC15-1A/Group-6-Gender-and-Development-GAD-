import mongoose from 'mongoose';

const SeminarArchiveSchema = new mongoose.Schema(
  {
    schoolYear: { type: String, required: true, index: true },
    archivedAt: { type: Date, default: Date.now },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

    originalSeminarId: { type: mongoose.Schema.Types.ObjectId, index: true },
    title: String,
    description: String,
    location: String,
    date: Date,
    startTime: String,
    durationHours: Number,
    mandatory: Boolean,
    capacity: Number,
    isHeld: Boolean,
    heldAt: Date,
    sessions: [
      {
        date: Date,
        startTime: String,
        durationHours: Number,
        isHeld: Boolean,
        heldAt: Date,
      },
    ],
    registeredEmployees: [{ type: mongoose.Schema.Types.ObjectId }],
    certificateReleaseMode: String,
    requiredSessionsToPass: Number,
    multiSessionType: String,
    originalCreatedAt: Date,
    originalUpdatedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('SeminarArchive', SeminarArchiveSchema);
