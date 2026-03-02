/**
 * Migration script: Import 2026 presences, rimborsi, and rapportini
 * from Appsmith MongoDB (local on VPS) to MongoDB Atlas.
 *
 * Run this script DIRECTLY on the Hetzner VPS:
 *   node migrate-2026.js
 *
 * Prerequisites on VPS: Node.js, mongodb driver
 *   npm install mongodb
 */

const { MongoClient, ObjectId } = require("mongodb");

// --- Configuration ---
const SOURCE_URI = "mongodb://127.0.0.1:27017/presenze_app?directConnection=true";
const TARGET_URI = "mongodb+srv://presenze-admin:Presenze2024!@presences.ofalb6g.mongodb.net/presenze";

async function migrate() {
  console.log("=== Migrazione 2026: Presenze, Rimborsi, Rapportini ===\n");

  // Connect to both databases
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    await sourceClient.connect();
    console.log("✅ Connesso a Appsmith MongoDB (VPS)");

    await targetClient.connect();
    console.log("✅ Connesso a MongoDB Atlas\n");

    const sourceDb = sourceClient.db("presenze_app");
    const targetDb = targetClient.db("presenze");

    // =============================================
    // 1. Load employee and site mappings from Atlas
    // =============================================
    console.log("--- Caricamento mappature dipendenti e cantieri da Atlas ---");
    const atlasEmployees = await targetDb.collection("employees").find({}).toArray();
    const atlasSites = await targetDb.collection("sites").find({}).toArray();
    console.log(`  Dipendenti in Atlas: ${atlasEmployees.length}`);
    console.log(`  Cantieri in Atlas: ${atlasSites.length}`);

    // Build lookup maps by badgeId and name
    const empByBadge = {};
    const empByName = {};
    atlasEmployees.forEach(e => {
      if (e.badgeId) empByBadge[e.badgeId.toUpperCase()] = e;
      const fullName = `${e.firstName} ${e.lastName}`.trim().toLowerCase();
      empByName[fullName] = e;
      if (e.fullName) empByName[e.fullName.toLowerCase()] = e;
    });

    const siteByName = {};
    atlasSites.forEach(s => {
      siteByName[s.name.toLowerCase()] = s;
    });

    // Get companyId from the first employee (FC Costruzioni)
    const defaultCompanyId = atlasEmployees[0]?.companyId || null;
    console.log(`  CompanyId default: ${defaultCompanyId}\n`);

    // =============================================
    // 2. Migrate 2026 Presences
    // =============================================
    console.log("--- Migrazione Presenze 2026 ---");

    // Find source collection names (Appsmith may use different names)
    const collections = await sourceDb.listCollections().toArray();
    const collNames = collections.map(c => c.name);
    console.log(`  Collezioni disponibili: ${collNames.join(", ")}`);

    // Try to find presences collection
    const presenceCollName = collNames.find(n =>
      n.toLowerCase().includes("presence") || n.toLowerCase().includes("presenz")
    ) || "presences";

    console.log(`  Usando collezione presenze: ${presenceCollName}`);

    const start2026 = new Date("2026-01-01T00:00:00.000Z");
    const end2026 = new Date("2026-12-31T23:59:59.999Z");

    const sourcePresences = await sourceDb.collection(presenceCollName).find({
      date: { $gte: start2026, $lte: end2026 }
    }).toArray();

    console.log(`  Presenze 2026 trovate nel source: ${sourcePresences.length}`);

    // Check existing presences in Atlas to avoid duplicates
    const existingPresences = await targetDb.collection("presences").find({
      date: { $gte: start2026, $lte: end2026 }
    }).toArray();

    const existingPresenceKeys = new Set(
      existingPresences.map(p => `${p.employeeId}_${new Date(p.date).toISOString().split("T")[0]}`)
    );

    console.log(`  Presenze 2026 già in Atlas: ${existingPresences.length}`);

    let presInserted = 0;
    let presSkipped = 0;
    let presErrors = 0;

    for (const sp of sourcePresences) {
      try {
        // Find matching employee in Atlas
        let employee = null;
        if (sp.badgeId) employee = empByBadge[sp.badgeId.toUpperCase()];
        if (!employee && sp.employeeName) employee = empByName[sp.employeeName.toLowerCase()];
        if (!employee && sp.employee_name) employee = empByName[sp.employee_name.toLowerCase()];

        // Find matching site in Atlas
        let site = null;
        if (sp.siteName) site = siteByName[sp.siteName.toLowerCase()];
        if (!site && sp.site_name) site = siteByName[sp.site_name.toLowerCase()];
        if (!site && sp.siteId) {
          // Try to find by looking at the source site
          const sourceSite = await sourceDb.collection(
            collNames.find(n => n.toLowerCase().includes("site") || n.toLowerCase().includes("cantier")) || "sites"
          ).findOne({ _id: sp.siteId });
          if (sourceSite && sourceSite.name) site = siteByName[sourceSite.name.toLowerCase()];
        }

        if (!employee) {
          console.log(`  ⚠ Dipendente non trovato per presenza: ${sp.employeeName || sp.employee_name || sp.badgeId || "unknown"}`);
          presErrors++;
          continue;
        }

        if (!site) {
          console.log(`  ⚠ Cantiere non trovato per presenza: ${sp.siteName || sp.site_name || "unknown"}`);
          presErrors++;
          continue;
        }

        const dateKey = `${employee._id}_${new Date(sp.date).toISOString().split("T")[0]}`;
        if (existingPresenceKeys.has(dateKey)) {
          presSkipped++;
          continue;
        }

        const presenceDoc = {
          companyId: defaultCompanyId,
          employeeId: employee._id,
          employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
          siteId: site._id,
          siteName: site.name,
          date: new Date(sp.date),
          status: sp.status || "Presente",
          overtimeHours: Number(sp.overtimeHours || sp.overtime_hours || 0),
          dailyRate: Number(sp.dailyRate || sp.daily_rate || employee.dailyRate || 0),
          overtimeRate: Number(sp.overtimeRate || sp.overtime_rate || employee.overtimeRate || 0),
          dailyContribution: Number(sp.dailyContribution || sp.daily_contribution || employee.dailyContribution || 0),
          createdByName: sp.createdByName || sp.created_by_name || "migrazione",
          createdByEmail: sp.createdByEmail || sp.created_by_email || "",
          createdAt: sp.createdAt || sp.created_at || new Date(),
          updatedAt: sp.updatedAt || sp.updated_at || new Date(),
        };

        await targetDb.collection("presences").insertOne(presenceDoc);
        existingPresenceKeys.add(dateKey);
        presInserted++;
      } catch (err) {
        if (err.code === 11000) {
          presSkipped++;
        } else {
          console.log(`  ❌ Errore presenza: ${err.message}`);
          presErrors++;
        }
      }
    }

    console.log(`  ✅ Presenze inserite: ${presInserted}`);
    console.log(`  ⏭ Presenze skippate (già esistenti): ${presSkipped}`);
    if (presErrors > 0) console.log(`  ❌ Errori: ${presErrors}`);
    console.log();

    // =============================================
    // 3. Migrate Rimborsi
    // =============================================
    console.log("--- Migrazione Rimborsi ---");

    const rimborsiCollName = collNames.find(n =>
      n.toLowerCase().includes("rimborsi") || n.toLowerCase().includes("rimborso")
    ) || "rimborsis";

    console.log(`  Usando collezione rimborsi: ${rimborsiCollName}`);

    const sourceRimborsi = await sourceDb.collection(rimborsiCollName).find({}).toArray();
    console.log(`  Rimborsi trovati nel source: ${sourceRimborsi.length}`);

    const existingRimborsi = await targetDb.collection("rimborsos").find({}).toArray();
    // Build a set of existing rimborsi keys for dedup
    const existingRimborsiKeys = new Set(
      existingRimborsi.map(r => `${r.employeeId}_${new Date(r.date).toISOString().split("T")[0]}_${r.amount}`)
    );

    console.log(`  Rimborsi già in Atlas: ${existingRimborsi.length}`);

    let rimbInserted = 0;
    let rimbSkipped = 0;
    let rimbErrors = 0;

    for (const sr of sourceRimborsi) {
      try {
        let employee = null;
        if (sr.badgeId) employee = empByBadge[sr.badgeId.toUpperCase()];
        if (!employee && sr.employeeName) employee = empByName[sr.employeeName.toLowerCase()];
        if (!employee && sr.employee_name) employee = empByName[sr.employee_name.toLowerCase()];

        let site = null;
        if (sr.siteName) site = siteByName[sr.siteName.toLowerCase()];
        if (!site && sr.site_name) site = siteByName[sr.site_name.toLowerCase()];

        if (!employee) {
          console.log(`  ⚠ Dipendente non trovato per rimborso: ${sr.employeeName || sr.employee_name || "unknown"}`);
          rimbErrors++;
          continue;
        }

        const amount = Number(sr.amount || 0);
        const dateStr = new Date(sr.date).toISOString().split("T")[0];
        const key = `${employee._id}_${dateStr}_${amount}`;

        if (existingRimborsiKeys.has(key)) {
          rimbSkipped++;
          continue;
        }

        const rimborsoDoc = {
          companyId: defaultCompanyId,
          employeeId: employee._id,
          employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
          siteId: site ? site._id : null,
          siteName: site ? site.name : "",
          date: new Date(sr.date),
          amount: amount,
          note: sr.note || sr.notes || "",
          createdAt: sr.createdAt || sr.created_at || new Date(),
          updatedAt: sr.updatedAt || sr.updated_at || new Date(),
        };

        await targetDb.collection("rimborsos").insertOne(rimborsoDoc);
        existingRimborsiKeys.add(key);
        rimbInserted++;
      } catch (err) {
        console.log(`  ❌ Errore rimborso: ${err.message}`);
        rimbErrors++;
      }
    }

    console.log(`  ✅ Rimborsi inseriti: ${rimbInserted}`);
    console.log(`  ⏭ Rimborsi skippati (già esistenti): ${rimbSkipped}`);
    if (rimbErrors > 0) console.log(`  ❌ Errori: ${rimbErrors}`);
    console.log();

    // =============================================
    // 4. Migrate Rapportini
    // =============================================
    console.log("--- Migrazione Rapportini ---");

    const rapportiniCollName = collNames.find(n =>
      n.toLowerCase().includes("rapportin")
    ) || "rapportinos";

    console.log(`  Usando collezione rapportini: ${rapportiniCollName}`);

    const sourceRapportini = await sourceDb.collection(rapportiniCollName).find({}).toArray();
    console.log(`  Rapportini trovati nel source: ${sourceRapportini.length}`);

    const existingRapportini = await targetDb.collection("rapportinos").find({}).toArray();
    const existingRappKeys = new Set(
      existingRapportini.map(r => `${r.siteId}_${new Date(r.date).toISOString().split("T")[0]}_${(r.text || "").substring(0, 50)}`)
    );

    console.log(`  Rapportini già in Atlas: ${existingRapportini.length}`);

    let rappInserted = 0;
    let rappSkipped = 0;
    let rappErrors = 0;

    for (const sr of sourceRapportini) {
      try {
        let site = null;
        if (sr.siteName) site = siteByName[sr.siteName.toLowerCase()];
        if (!site && sr.site_name) site = siteByName[sr.site_name.toLowerCase()];
        if (!site && sr.siteId) {
          const siteCollName = collNames.find(n => n.toLowerCase().includes("site") || n.toLowerCase().includes("cantier")) || "sites";
          const sourceSite = await sourceDb.collection(siteCollName).findOne({ _id: sr.siteId });
          if (sourceSite && sourceSite.name) site = siteByName[sourceSite.name.toLowerCase()];
        }

        if (!site) {
          console.log(`  ⚠ Cantiere non trovato per rapportino: ${sr.siteName || sr.site_name || "unknown"}`);
          rappErrors++;
          continue;
        }

        const text = sr.text || sr.description || sr.content || "";
        const dateStr = new Date(sr.date).toISOString().split("T")[0];
        const key = `${site._id}_${dateStr}_${text.substring(0, 50)}`;

        if (existingRappKeys.has(key)) {
          rappSkipped++;
          continue;
        }

        const rapportinoDoc = {
          companyId: defaultCompanyId,
          siteId: site._id,
          siteName: site.name,
          date: new Date(sr.date),
          text: text,
          createdBy: sr.createdBy || { userId: "", name: "migrazione", role: "" },
          createdAt: sr.createdAt || sr.created_at || new Date(),
          updatedAt: sr.updatedAt || sr.updated_at || new Date(),
        };

        await targetDb.collection("rapportinos").insertOne(rapportinoDoc);
        existingRappKeys.add(key);
        rappInserted++;
      } catch (err) {
        console.log(`  ❌ Errore rapportino: ${err.message}`);
        rappErrors++;
      }
    }

    console.log(`  ✅ Rapportini inseriti: ${rappInserted}`);
    console.log(`  ⏭ Rapportini skippati (già esistenti): ${rappSkipped}`);
    if (rappErrors > 0) console.log(`  ❌ Errori: ${rappErrors}`);
    console.log();

    // =============================================
    // Summary
    // =============================================
    console.log("=== RIEPILOGO MIGRAZIONE ===");
    console.log(`  Presenze 2026: ${presInserted} inserite, ${presSkipped} skippate, ${presErrors} errori`);
    console.log(`  Rimborsi:      ${rimbInserted} inseriti, ${rimbSkipped} skippati, ${rimbErrors} errori`);
    console.log(`  Rapportini:    ${rappInserted} inseriti, ${rappSkipped} skippati, ${rappErrors} errori`);
    console.log("\n✅ Migrazione completata!");

  } catch (err) {
    console.error("❌ Errore fatale:", err);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();
