const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI =
  "mongodb+srv://presenze-admin:Presenze2024!@presences.ofalb6g.mongodb.net/presenze?retryWrites=true&w=majority&appName=Presences";

const CompanySchema = new mongoose.Schema({ name: String, slug: String, active: Boolean }, { timestamps: true });
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, lowercase: true },
  password: String,
  role: String,
  companyId: mongoose.Schema.Types.ObjectId,
  active: { type: Boolean, default: true },
}, { timestamps: true });

const Company = mongoose.models.Company || mongoose.model("Company", CompanySchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connesso a MongoDB Atlas");

  // Crea azienda
  let company = await Company.findOne({ slug: "fc-costruzioni" });
  if (!company) {
    company = await Company.create({ name: "FC Costruzioni SRL", slug: "fc-costruzioni", active: true });
    console.log("Azienda creata:", company.name);
  } else {
    console.log("Azienda già esistente:", company.name);
  }

  // Crea utente admin
  const existing = await User.findOne({ email: "admin@fccostruzioni.it" });
  if (!existing) {
    const hash = await bcrypt.hash("Admin2024!", 12);
    await User.create({
      name: "Amministratore",
      email: "admin@fccostruzioni.it",
      password: hash,
      role: "admin",
      companyId: company._id,
      active: true,
    });
    console.log("Utente admin creato!");
    console.log("  Email:    admin@fccostruzioni.it");
    console.log("  Password: Admin2024!");
  } else {
    console.log("Utente admin già esistente");
  }

  await mongoose.disconnect();
  console.log("Fatto!");
}

seed().catch(console.error);
