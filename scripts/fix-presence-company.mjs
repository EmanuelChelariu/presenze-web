// Migrazione: aggiorna companyId e companyName su tutte le presenze
// usando il companyId del dipendente (Employee) invece di quello della sessione utente
import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://presenze-admin:Presenze2024!@presences.ofalb6g.mongodb.net/presenze";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connesso a MongoDB");

  const db = mongoose.connection.db;
  const presences = db.collection("presences");
  const employees = db.collection("employees");
  const companies = db.collection("companies");

  // Carica tutti i dipendenti e le aziende
  const allEmployees = await employees.find({}).toArray();
  const allCompanies = await companies.find({}).toArray();

  const companyMap = {};
  for (const c of allCompanies) {
    companyMap[c._id.toString()] = c.name;
  }

  console.log(`Trovati ${allEmployees.length} dipendenti, ${allCompanies.length} aziende`);

  let updated = 0;
  let skipped = 0;

  for (const emp of allEmployees) {
    if (!emp.companyId) {
      console.log(`  Skip dipendente ${emp.firstName} ${emp.lastName} — no companyId`);
      skipped++;
      continue;
    }

    const companyName = companyMap[emp.companyId.toString()] || "";

    // Aggiorna tutte le presenze di questo dipendente
    const result = await presences.updateMany(
      { employeeId: emp._id },
      { $set: { companyId: emp.companyId, companyName } }
    );

    if (result.modifiedCount > 0) {
      console.log(`  ${emp.firstName} ${emp.lastName} → ${companyName}: ${result.modifiedCount} presenze aggiornate`);
      updated += result.modifiedCount;
    }
  }

  console.log(`\nMigrazione completata: ${updated} presenze aggiornate, ${skipped} dipendenti saltati`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Errore:", err);
  process.exit(1);
});
