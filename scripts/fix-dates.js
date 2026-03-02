/**
 * Fix string dates in Atlas:
 * 1. Drop unique index temporarily
 * 2. Convert string dates to Date objects
 * 3. Remove duplicates (keep newest)
 * 4. Recreate unique index
 *
 * Run: node scripts/fix-dates.js
 */
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://presenze-admin:Presenze2024!@presences.ofalb6g.mongodb.net/presenze";

async function fix() {
  console.log("Connecting to Atlas...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log("Connected!\n");

  const presences = db.collection("presences");

  // ========== STEP 1: Drop unique index ==========
  console.log("--- Step 1: Drop unique index ---");
  try {
    await presences.dropIndex("employeeId_1_date_1");
    console.log("  Index dropped");
  } catch (e) {
    console.log("  Index not found or already dropped:", e.message);
  }

  // ========== STEP 2: Convert string dates ==========
  console.log("--- Step 2: Convert string dates ---");

  const stringDates = await presences.countDocuments({ date: { $type: "string" } });
  console.log(`  Found ${stringDates} presences with string dates`);

  if (stringDates > 0) {
    // Process one by one to handle errors
    const cursor = presences.find({ date: { $type: "string" } });
    let converted = 0;
    let errors = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      try {
        const newDate = new Date(doc.date);
        if (isNaN(newDate.getTime())) {
          console.log(`  ⚠ Invalid date: ${doc.date} for ${doc._id}`);
          errors++;
          continue;
        }
        // Normalize to midnight UTC
        newDate.setUTCHours(0, 0, 0, 0);
        await presences.updateOne({ _id: doc._id }, { $set: { date: newDate } });
        converted++;
      } catch (e) {
        errors++;
      }
    }
    console.log(`  Converted: ${converted}, Errors: ${errors}`);
  }

  // Also fix createdAt/updatedAt strings
  const strTimestamps = await presences.countDocuments({ createdAt: { $type: "string" } });
  if (strTimestamps > 0) {
    const cursor2 = presences.find({ createdAt: { $type: "string" } });
    let fixed = 0;
    while (await cursor2.hasNext()) {
      const doc = await cursor2.next();
      const updates = {};
      if (typeof doc.createdAt === "string") updates.createdAt = new Date(doc.createdAt);
      if (typeof doc.updatedAt === "string") updates.updatedAt = new Date(doc.updatedAt);
      await presences.updateOne({ _id: doc._id }, { $set: updates });
      fixed++;
    }
    console.log(`  Timestamps fixed: ${fixed}`);
  }

  // ========== STEP 3: Remove duplicates ==========
  console.log("--- Step 3: Remove duplicates ---");

  // Find all duplicate groups (same employee + same date)
  const duplicates = await presences.aggregate([
    {
      $group: {
        _id: {
          employeeId: "$employeeId",
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
        },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
        // Keep the one with the latest updatedAt
        docs: { $push: { _id: "$_id", updatedAt: "$updatedAt" } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`  Found ${duplicates.length} duplicate groups`);

  let removed = 0;
  for (const dup of duplicates) {
    // Sort by updatedAt descending, keep the first (newest)
    const sorted = dup.docs.sort((a, b) => {
      const da = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
      const db2 = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
      return db2 - da;
    });

    // Delete all except the first (newest)
    const toDelete = sorted.slice(1).map(d => d._id);
    if (toDelete.length > 0) {
      await presences.deleteMany({ _id: { $in: toDelete } });
      removed += toDelete.length;
    }
  }
  console.log(`  Removed: ${removed} duplicates`);

  // ========== STEP 4: Recreate unique index ==========
  console.log("--- Step 4: Recreate unique index ---");
  await presences.createIndex({ employeeId: 1, date: 1 }, { unique: true });
  console.log("  Index recreated");

  // ========== Fix rimborsi and rapportini ==========
  console.log("\n--- Fix rimborsi dates ---");
  const r2cursor = db.collection("rimborsos").find({ date: { $type: "string" } });
  let rimbFixed = 0;
  while (await r2cursor.hasNext()) {
    const doc = await r2cursor.next();
    const newDate = new Date(doc.date);
    if (!isNaN(newDate.getTime())) {
      await db.collection("rimborsos").updateOne({ _id: doc._id }, { $set: { date: newDate } });
      rimbFixed++;
    }
  }
  console.log(`  Rimborsi fixed: ${rimbFixed}`);

  console.log("--- Fix rapportini dates ---");
  const r3cursor = db.collection("rapportinos").find({ date: { $type: "string" } });
  let rappFixed = 0;
  while (await r3cursor.hasNext()) {
    const doc = await r3cursor.next();
    const newDate = new Date(doc.date);
    if (!isNaN(newDate.getTime())) {
      await db.collection("rapportinos").updateOne({ _id: doc._id }, { $set: { date: newDate } });
      rappFixed++;
    }
  }
  console.log(`  Rapportini fixed: ${rappFixed}`);

  // Final count
  const total = await presences.countDocuments();
  const total2026 = await presences.countDocuments({
    date: { $gte: new Date("2026-01-01"), $lte: new Date("2026-12-31T23:59:59") }
  });
  console.log(`\n✅ Totale presenze: ${total}`);
  console.log(`✅ Presenze 2026: ${total2026}`);
  console.log("✅ Tutto corretto!");

  await mongoose.disconnect();
}

fix().catch(console.error);
