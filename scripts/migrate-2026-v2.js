/**
 * Migration script v2: Import 2026 presences from Appsmith
 * FIXES: uses 'presences' collection explicitly, handles string dates
 *
 * Run on VPS: node migrate-2026-v2.js
 */

const { MongoClient, ObjectId } = require("mongodb");

const SOURCE_URI = "mongodb://127.0.0.1:27017/presenze_app?directConnection=true";
const TARGET_URI = "mongodb+srv://presenze-admin:Presenze2024!@presences.ofalb6g.mongodb.net/presenze";

async function migrate() {
  console.log("=== Migrazione v2: Presenze 2026 ===\n");

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
    // 1. Load mappings
    // =============================================
    console.log("--- Caricamento mappature ---");
    const atlasEmployees = await targetDb.collection("employees").find({}).toArray();
    const atlasSites = await targetDb.collection("sites").find({}).toArray();
    console.log(`  Dipendenti Atlas: ${atlasEmployees.length}`);
    console.log(`  Cantieri Atlas: ${atlasSites.length}`);

    // Map by name (lowercase, trimmed)
    const empByName = {};
    atlasEmployees.forEach(e => {
      const fn = `${e.firstName} ${e.lastName}`.trim().toLowerCase();
      empByName[fn] = e;
      if (e.fullName) empByName[e.fullName.trim().toLowerCase()] = e;
      // Also map "lastName firstName" order
      const ln = `${e.lastName} ${e.firstName}`.trim().toLowerCase();
      empByName[ln] = e;
    });

    const siteByName = {};
    atlasSites.forEach(s => {
      siteByName[s.name.trim().toLowerCase()] = s;
    });

    // Also build source employee map by ObjectId string -> source employee doc
    const sourceEmployees = await sourceDb.collection("employees").find({}).toArray();
    const sourceEmpById = {};
    sourceEmployees.forEach(e => {
      sourceEmpById[String(e._id)] = e;
    });

    // Source site map
    const sourceSites = await sourceDb.collection("sites").find({}).toArray();
    const sourceSiteById = {};
    sourceSites.forEach(s => {
      sourceSiteById[String(s._id)] = s;
    });

    const defaultCompanyId = atlasEmployees[0]?.companyId || null;
    console.log(`  CompanyId: ${defaultCompanyId}\n`);

    // =============================================
    // 2. Get 2026 presences using REGEX (dates are strings!)
    // =============================================
    console.log("--- Migrazione Presenze 2026 (collezione: presences) ---");

    const sourcePresences = await sourceDb.collection("presences").find({
      date: { $regex: /^2026/ }
    }).toArray();

    console.log(`  Presenze 2026 trovate: ${sourcePresences.length}`);

    // Load existing Atlas presences to avoid duplicates
    // Atlas presences have proper Date objects, so query normally
    const start2026 = new Date("2026-01-01T00:00:00.000Z");
    const end2026 = new Date("2026-12-31T23:59:59.999Z");
    const existingPresences = await targetDb.collection("presences").find({
      date: { $gte: start2026, $lte: end2026 }
    }).toArray();

    const existingKeys = new Set(
      existingPresences.map(p => {
        const d = new Date(p.date).toISOString().split("T")[0];
        return `${p.employeeId}_${d}`;
      })
    );
    console.log(`  Presenze 2026 già in Atlas: ${existingPresences.length}`);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    const notFoundEmployees = new Set();
    const notFoundSites = new Set();

    for (const sp of sourcePresences) {
      try {
        // --- Find employee ---
        let employee = null;

        // Try by employeeName first
        if (sp.employeeName) {
          employee = empByName[sp.employeeName.trim().toLowerCase()];
        }

        // Try by looking up source employee -> use their name
        if (!employee && sp.employeeId) {
          const srcEmp = sourceEmpById[String(sp.employeeId)];
          if (srcEmp) {
            const names = [
              `${srcEmp.firstName} ${srcEmp.lastName}`,
              `${srcEmp.lastName} ${srcEmp.firstName}`,
              srcEmp.fullName,
              srcEmp.name,
            ].filter(Boolean);
            for (const n of names) {
              employee = empByName[n.trim().toLowerCase()];
              if (employee) break;
            }
          }
        }

        if (!employee) {
          const name = sp.employeeName || "ID:" + sp.employeeId;
          if (!notFoundEmployees.has(name)) {
            console.log(`  ⚠ Dipendente non trovato: ${name}`);
            notFoundEmployees.add(name);
          }
          errors++;
          continue;
        }

        // --- Find site ---
        let site = null;

        if (sp.siteName) {
          site = siteByName[sp.siteName.trim().toLowerCase()];
        }

        if (!site && sp.siteId) {
          const srcSite = sourceSiteById[String(sp.siteId)];
          if (srcSite && srcSite.name) {
            site = siteByName[srcSite.name.trim().toLowerCase()];
          }
        }

        if (!site) {
          const name = sp.siteName || "ID:" + sp.siteId;
          if (!notFoundSites.has(name)) {
            console.log(`  ⚠ Cantiere non trovato: ${name}`);
            notFoundSites.add(name);
          }
          errors++;
          continue;
        }

        // --- Check duplicate ---
        const dateStr = String(sp.date).split("T")[0];
        const key = `${employee._id}_${dateStr}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }

        // --- Build document ---
        const presenceDoc = {
          companyId: defaultCompanyId,
          employeeId: employee._id,
          employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
          siteId: site._id,
          siteName: site.name,
          date: new Date(sp.date),
          status: sp.status || "Presente",
          overtimeHours: Number(sp.overtimeHours || 0),
          dailyRate: Number(sp.dailyRate || employee.dailyRate || 0),
          overtimeRate: Number(sp.overtimeRate || employee.overtimeRate || 0),
          dailyContribution: Number(sp.dailyContribution || employee.dailyContribution || 0),
          createdByName: sp.createdByName || "migrazione",
          createdByEmail: sp.createdByEmail || "",
          createdAt: sp.createdAt ? new Date(sp.createdAt) : new Date(),
          updatedAt: sp.updatedAt ? new Date(sp.updatedAt) : new Date(),
        };

        await targetDb.collection("presences").insertOne(presenceDoc);
        existingKeys.add(key);
        inserted++;

        // Progress log every 100
        if (inserted % 100 === 0) {
          console.log(`  ... ${inserted} inserite finora`);
        }
      } catch (err) {
        if (err.code === 11000) {
          skipped++;
        } else {
          console.log(`  ❌ Errore: ${err.message}`);
          errors++;
        }
      }
    }

    console.log(`\n  ✅ Presenze inserite: ${inserted}`);
    console.log(`  ⏭ Skippate (duplicati): ${skipped}`);
    console.log(`  ❌ Errori: ${errors}`);

    console.log("\n=== MIGRAZIONE COMPLETATA ===");

  } catch (err) {
    console.error("❌ Errore fatale:", err);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();
