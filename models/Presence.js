import mongoose from "mongoose";

const PresenceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName: { type: String }, // snapshot

    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true },
    siteName: { type: String }, // snapshot

    companyName: { type: String, default: "" }, // snapshot nome azienda del dipendente

    date: { type: Date, required: true }, // inizio giorno

    status: {
      type: String,
      enum: ["Presente", "Assente", "Malattia", "Ferie", "Infortunio"],
      default: "Presente",
    },

    overtimeHours: { type: Number, default: 0 },

    // Snapshot tariffe al momento dell'inserimento
    dailyRate: { type: Number, default: 0 },
    overtimeRate: { type: Number, default: 0 },
    dailyContribution: { type: Number, default: 0 },

    createdByName: { type: String, default: "" },
    createdByEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

// Indice per evitare duplicati: stesso dipendente, stesso giorno
PresenceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
PresenceSchema.index({ siteId: 1, date: 1 });
PresenceSchema.index({ companyId: 1, date: 1 });

export default mongoose.models.Presence || mongoose.model("Presence", PresenceSchema);
