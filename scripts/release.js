const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function runCommand(command) {
  try {
    return execSync(command, { encoding: "utf8" });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}

try {
  // 1. Load package.json
  const pkgPath = path.join(__dirname, "../package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error("package.json file not found!");
  }
  
  const pkgContent = fs.readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(pkgContent);

  // 2. Increment patch version (X.Y.Z -> X.Y.Z+1)
  const currentVersion = pkg.version || "0.1.0";
  const parts = currentVersion.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }
  parts[2] += 1;
  const newVersion = parts.join(".");
  pkg.version = newVersion;

  // 3. Write updated version to package.json
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`✓ Version bumped: ${currentVersion} ➔ ${newVersion}`);

  // 4. Run Git commands
  console.log("Checking Git status...");
  
  // Stage all modifications
  console.log("Staging changes...");
  runCommand("git add .");

  // Commit changes
  console.log(`Committing release v${newVersion}...`);
  runCommand(`git commit -m "Release v${newVersion}"`);

  // Create local tag
  console.log(`Tagging release v${newVersion}...`);
  runCommand(`git tag v${newVersion}`);

  // Detect current branch name dynamically
  let branchName = "main";
  try {
    branchName = runCommand("git branch --show-current").trim() || "main";
  } catch (e) {
    console.log("Failed to auto-detect active branch, defaulting to 'main'.");
  }

  // Push to remote repository
  console.log(`Pushing code to GitHub on branch '${branchName}'...`);
  runCommand(`git push origin ${branchName}`);
  
  console.log("Pushing release tag to GitHub...");
  runCommand("git push origin --tags");

  console.log(`\n🎉 Success! Release v${newVersion} is pushed to GitHub.`);
  console.log("Vercel will start deploying your new build automatically.");
} catch (error) {
  console.error("\n❌ Release process failed:", error.message);
  process.exit(1);
}
