import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["doctor", "patient"], required: true },
    profileImageUrl: String,
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
