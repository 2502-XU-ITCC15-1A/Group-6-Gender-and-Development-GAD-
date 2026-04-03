import mongoose from 'mongoose';

const PinVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

PinVerificationSchema.index({ email: 1, code: 1, expiresAt: 1 });
PinVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PinVerification', PinVerificationSchema);

