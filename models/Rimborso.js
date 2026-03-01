import mongoose from "mongoose";

const RimborsoSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName: { type: String },
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site" },
    siteName: { type: String },
    date: { type: Date, required: true },
    amount: { type: Number, required: true }, // positivo = rimborso, negativo = detrazione
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Rimborso || mongoose.model("Rimborso", RimborsoSchema);
