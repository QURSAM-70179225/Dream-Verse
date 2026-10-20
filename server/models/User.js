import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Never returned by default queries; select it explicitly when logging in.
    passwordHash: { type: String, required: true, select: false },
    // Logins issued before this moment stop working (set when the password is reset).
    passwordChangedAt: { type: Date },
    // Password reset: only a SHA-256 hash of the emailed token is stored, never the token itself.
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    resetRequestedAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
