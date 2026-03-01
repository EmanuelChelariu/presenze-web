import mongoose from "mongoose";

const RapportinoSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    siteName: { type: String },
    date: { type: Date, required: true },
    text: { type: String, required: true },
    createdBy: {
      userId: String,
      name: String,
      role: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Rapportino || mongoose.model("Rapportino", RapportinoSchema);
