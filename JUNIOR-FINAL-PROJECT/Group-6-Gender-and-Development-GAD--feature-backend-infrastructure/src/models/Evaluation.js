import mongoose from 'mongoose';

const EvaluationSchema = new mongoose.Schema(
  {
    registrationID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
      required: true,
    },
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
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
    },
    wouldRecommend: {
      type: Boolean,
      default: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

EvaluationSchema.index({ seminarID: 1, employeeID: 1 }, { unique: true });

export default mongoose.model('Evaluation', EvaluationSchema);