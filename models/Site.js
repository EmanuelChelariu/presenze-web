import mongoose from "mongoose";

const SiteSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true },
    operativo: { type: Boolean, default: true },
    address: { type: String, default: "" },
    committente: { type: String, default: "" },
    startDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Site || mongoose.model("Site", SiteSchema);
