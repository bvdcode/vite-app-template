const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function findFiles(
  dir,
  extensions = [".json", ".html", ".md", ".js", ".ts", ".tsx"]
) {
  let results = [];
  const ignoreFiles = [".DS_Store", "Thumbs.db", path.basename(__filename)];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!["node_modules", ".git", "dist", "build"].includes(file)) {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext) || file === "README.md") {
        results.push(filePath);
      }
    }
  }

  return results;
}

function replaceInFile(filePath, projectName) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    const lowerCaseName = projectName.toLowerCase();
    if (content.includes("vite-app-template")) {
      content = content.replace(/vite-app-template/g, lowerCaseName);
      modified = true;
    }

    if (content.includes("VITE_APP_TEMPLATE")) {
      content = content.replace(/VITE_APP_TEMPLATE/g, projectName);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return false;
  }
}

function sanitizeProjectName(projectName) {
  const allowedChars = /[a-zA-Z0-9.\-_ ]/g;
  const sanitized =
    projectName.match(allowedChars)?.join("").replace(/\./g, "-") || "";
  return sanitized;
}

function main() {
  rl.question("Enter project name: ", (inputName) => {
    if (!inputName.trim()) {
      console.log("❌ Project name cannot be empty!");
      rl.close();
      return;
    }

    const projectName = sanitizeProjectName(inputName.trim());

    if (!projectName) {
      console.log("❌ Project name contains only invalid characters!");
      rl.close();
      return;
    }

    if (projectName !== inputName.trim()) {
      console.log(
        `📝 Project name sanitized: "${inputName.trim()}" → "${projectName}"`
      );
    }

    console.log(`\n🔍 Searching for files to replace...`);

    const currentDir = process.cwd();
    const files = findFiles(currentDir);

    console.log(`📁 Found ${files.length} files to check`);

    let processedFiles = 0;
    let modifiedFiles = 0;

    for (const file of files) {
      processedFiles++;
      if (replaceInFile(file, projectName)) {
        modifiedFiles++;
      }
    }

    console.log(`\n✨ Done!`);
    console.log(`📊 Files processed: ${processedFiles}`);
    console.log(`🔄 Files modified: ${modifiedFiles}`);
    console.log(`🎯 Project renamed to: ${projectName}`);

    rl.close();
  });
}

main();
