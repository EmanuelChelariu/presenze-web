/**
 * Diagnostic script: check both presence collections and their date formats
 * Run on VPS: node check-presences.js
 */
const { MongoClient } = require("mongodb");
const SOURCE_URI = "mongodb://127.0.0.1:27017/presenze_app?directConnection=true";

async function check() {
  const client = new MongoClient(SOURCE_URI);
  await client.connect();
  const db = client.db("presenze_app");

  // Check both collections
  for (const collName of ["presences", "utenti_presenze"]) {
    console.log(`\n=== Collezione: ${collName} ===`);
    const count = await db.collection(collName).countDocuments();
    console.log(`  Totale documenti: ${count}`);

    if (count > 0) {
      // Show first 3 documents to see structure
      const samples = await db.collection(collName).find().limit(3).toArray();
      samples.forEach((doc, i) => {
        console.log(`\n  Documento ${i + 1}:`);
        console.log(`    _id: ${doc._id}`);
        console.log(`    date: ${doc.date} (type: ${typeof doc.date})`);
        console.log(`    employeeName/employee_name: ${doc.employeeName || doc.employee_name || "N/A"}`);
        console.log(`    siteName/site_name: ${doc.siteName || doc.site_name || "N/A"}`);
        console.log(`    status: ${doc.status || "N/A"}`);
        console.log(`    Keys: ${Object.keys(doc).join(", ")}`);
      });

      // Check dates range
      const dateField = samples[0].date ? "date" : (samples[0].Date ? "Date" : null);
      if (dateField) {
        const newest = await db.collection(collName).find().sort({ [dateField]: -1 }).limit(1).toArray();
        const oldest = await db.collection(collName).find().sort({ [dateField]: 1 }).limit(1).toArray();
        console.log(`\n  Data più vecchia: ${oldest[0]?.[dateField]}`);
        console.log(`  Data più recente: ${newest[0]?.[dateField]}`);

        // Count 2026 with different approaches
        const count2026Date = await db.collection(collName).countDocuments({
          [dateField]: { $gte: new Date("2026-01-01"), $lte: new Date("2026-12-31T23:59:59") }
        });
        console.log(`  Presenze 2026 (Date query): ${count2026Date}`);

        // Try string-based match
        const count2026Regex = await db.collection(collName).countDocuments({
          [dateField]: { $regex: /^2026/ }
        });
        console.log(`  Presenze 2026 (regex query): ${count2026Regex}`);

        // Count 2025
        const count2025Date = await db.collection(collName).countDocuments({
          [dateField]: { $gte: new Date("2025-01-01"), $lte: new Date("2025-12-31T23:59:59") }
        });
        console.log(`  Presenze 2025 (Date query): ${count2025Date}`);
      }
    }
  }

  await client.close();
}

check().catch(console.error);
