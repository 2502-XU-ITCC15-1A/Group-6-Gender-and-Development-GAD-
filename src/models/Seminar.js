import mongoose from 'mongoose';

const SeminarSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // e.g. "14:00"
    durationHours: { type: Number, required: true, min: 0.5 },
    mandatory: { type: Boolean, default: false },
    capacity: { type: Number, required: true, min: 1 },
    isHeld: { type: Boolean, default: false },
    heldAt: { type: Date },
    registeredEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
    materials: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearningMaterial',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    autoSendCertificates: {
      type: Boolean,
      default: false,
    },
    certificateReleaseMode: {
      type: String,
      enum: ['manual', 'evaluation', 'automatic'],
      default: 'evaluation',
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.model('Seminar', SeminarSchema);

