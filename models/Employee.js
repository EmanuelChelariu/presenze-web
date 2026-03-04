import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String },
    badgeId: { type: String, required: true, unique: true, uppercase: true },
    active: { type: Boolean, default: true },

    // Contatti
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    iban: { type: String, default: "" },
    role: { type: String, default: "" }, // ruolo lavorativo (es. muratore, elettricista)

    // Tariffe
    dailyRate: { type: Number, default: 0 },
    overtimeRate: { type: Number, default: 0 },
    dailyContribution: { type: Number, default: 0 },
    ratesEffectiveFrom: { type: Date, default: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
  },
  { timestamps: true }
);

// Genera fullName automaticamente
EmployeeSchema.pre("save", function () {
  this.fullName = `${this.firstName} ${this.lastName}`.trim();
});

export default mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
