import mongoose from "mongoose";

const DDTSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    googleDriveFileId: { type: String, required: true },
    googleDriveUrl: { type: String, required: true },
    date: { type: Date, required: true },
    uploadedBy: {
      userId: String,
      name: String,
      role: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.DDT || mongoose.model("DDT", DDTSchema);
