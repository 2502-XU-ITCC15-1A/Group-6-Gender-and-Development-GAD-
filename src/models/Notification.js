import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    employeeID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    type: {
      type: String,
      enum: ['approval', 'certificate', 'evaluation', 'seminar_update'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    seminarID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seminar',
    },
    registrationID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Registration',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ employeeID: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);