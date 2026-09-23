#!/usr/bin/env tsx

import "dotenv/config";

async function main() {
  try {
    console.log("🔍 Starting test...");
    
    // Test 1: Simple import
    console.log("📦 Testing import...");
    const { validateTransferReadiness } = await import("@/lib/server/transfer-service");
    console.log("✅ Import successful");
    
    // Test 2: Call function
    console.log("🔍 Running validation...");
    const result = await validateTransferReadiness();
    console.log("✅ Validation complete:", result.success);
    
    // Print summary
    console.log("\n📊 Transfer Preflight Results:");
    console.log("   ┌─────────────────────────────────────────────────────────────┐");
    console.log(`   │ Total Cars:          ${result.summary.totalCars.toString().padStart(6)} │`);
    console.log(`   │ Valid Cars:          ${result.summary.validCars.toString().padStart(6)} │`);
    console.log("   ├─────────────────────────────────────────────────────────────┤");
    console.log(`   │ Total Parts:         ${result.summary.totalParts.toString().padStart(6)} │`);
    console.log(`   │ Valid Parts:         ${result.summary.validParts.toString().padStart(6)} │`);
    console.log("   ├─────────────────────────────────────────────────────────────┤");
    console.log(`   │ Total Media:         ${result.summary.totalMedia.toString().padStart(6)} │`);
    console.log(`   │ Valid Media:         ${result.summary.validMedia.toString().padStart(6)} │`);
    console.log("   ├─────────────────────────────────────────────────────────────┤");
    console.log(`   │ Orphan Media:        ${result.summary.orphanMedia.toString().padStart(6)} │`);
    console.log(`   │ Missing Sellers:     ${result.summary.missingSellers.toString().padStart(6)} │`);
    console.log(`   │ Missing Compatibility:${result.summary.missingCompatibility.toString().padStart(3)} │`);
    console.log(`   │ Missing Images:      ${result.summary.missingImages.toString().padStart(6)} │`);
    console.log(`   │ Invalid Primary:     ${result.summary.invalidPrimary.toString().padStart(6)} │`);
    console.log(`   │ Invalid Order:       ${result.summary.invalidOrder.toString().padStart(6)} │`);
    console.log(`   │ Missing MinIO Objects:${result.summary.missingMinioObjects.toString().padStart(3)} │`);
    console.log("   └─────────────────────────────────────────────────────────────┘\n");
    
    if (result.errors.length > 0) {
      console.log("❌ ERRORS FOUND:");
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.type}] ${error.entityType.toUpperCase()} ${error.entityId}`);
        console.log(`      ${error.message}`);
        if (error.details) {
          console.log(`      Details: ${JSON.stringify(error.details)}`);
        }
        console.log("");
      });
    }
    
    if (result.warnings.length > 0) {
      console.log("⚠️  WARNINGS:");
      result.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.type}] ${warning.message}`);
        if (warning.details) {
          console.log(`      Details: ${JSON.stringify(warning.details)}`);
        }
        console.log("");
      });
    }
    
    if (result.success) {
      console.log("✅ All validations passed! Your data appears ready for transfer.");
      process.exit(0);
    } else {
      console.log("❌ Validation failed! Please fix the errors above before attempting transfer.");
      process.exit(1);
    }
  } catch (err) {
    console.error("💥 Caught error:");
    console.error("   Type:", typeof err);
    console.error("   Value:", err);
    console.error("   Is Error:", err instanceof Error);
    if (err instanceof Error) {
      console.error("   Message:", err.message);
      console.error("   Stack:", err.stack);
    }
    process.exit(1);
  }
}

main();
