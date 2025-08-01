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
      if (ignoreFiles.includes(file)) {
        continue;
      }
      if (extensions.includes(ext) || file === "README.md") {
        results.push(filePath);
      }
    }
  }

  return results;
}

function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), "project-config.json");
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configContent);
    }
    return {};
  } catch (error) {
    console.warn(`⚠️ Warning: Could not load config file: ${error.message}`);
    return {};
  }
}

function replaceInFile(filePath, sanitizedName, originalName, config) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;
    const sortedConfigKeys = Object.keys(config).sort(
      (a, b) => b.length - a.length
    );

    for (const key of sortedConfigKeys) {
      const replacementValue = config[key];
      const arrayPattern = `["${key}"]`;
      if (content.includes(arrayPattern)) {
        if (Array.isArray(replacementValue)) {
          content = content.replace(
            new RegExp(escapeRegExp(arrayPattern), "g"),
            JSON.stringify(replacementValue)
          );
          modified = true;
        }
      }

      if (content.includes(key)) {
        let valueToReplace = replacementValue;
        const htmlContentPattern = new RegExp(
          `content="${escapeRegExp(key)}"`,
          "g"
        );
        if (
          htmlContentPattern.test(content) &&
          Array.isArray(replacementValue)
        ) {
          valueToReplace = replacementValue.join(", ");
        } else if (
          typeof valueToReplace === "object" &&
          valueToReplace !== null
        ) {
          valueToReplace = JSON.stringify(valueToReplace);
        }

        content = content.replace(
          new RegExp(escapeRegExp(key), "g"),
          valueToReplace
        );
        modified = true;
      }
    }
    if (content.includes("VITE_APP_TEMPLATE")) {
      content = content.replace(/VITE_APP_TEMPLATE/g, originalName.trim());
      modified = true;
    }

    if (content.includes("vite-app-template")) {
      content = content.replace(
        /vite-app-template/g,
        sanitizedName.toLowerCase()
      );
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

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeProjectName(projectName) {
  let sanitized = projectName.replace(/[^a-zA-Z0-9]/g, "-");
  sanitized = sanitized.replace(/-+/g, "-");
  return sanitized.replace(/^-+|-+$/g, "");
}

function validateProjectName(projectName) {
  if (!projectName.trim()) {
    return { valid: false, error: "Project name cannot be empty!" };
  }

  const sanitized = sanitizeProjectName(projectName.trim());
  if (!sanitized) {
    return {
      valid: false,
      error: "Project name contains only invalid characters!",
    };
  }
  if (sanitized === "-" || sanitized.match(/^-+$/)) {
    return {
      valid: false,
      error: "Project name cannot consist only of dashes!",
    };
  }
  if (!sanitized.match(/^[a-zA-Z]/)) {
    return { valid: false, error: "Project name must start with a letter!" };
  }
  if (sanitized.length < 2) {
    return {
      valid: false,
      error: "Project name must be at least 2 characters long!",
    };
  }
  if (sanitized.length > 50) {
    return {
      valid: false,
      error: "Project name must be no more than 50 characters long!",
    };
  }

  return { valid: true, sanitized };
}

function main() {
  console.log(`📋 Loading project configuration...`);
  const config = loadConfig();
  const configKeys = Object.keys(config);

  if (configKeys.length > 0) {
    console.log(
      `📋 Found ${configKeys.length} config variables: ${configKeys.join(", ")}`
    );
  } else {
    console.log(`📋 No config file found or config is empty`);
  }

  const defaultName = config.VITE_APP_TEMPLATE_NAME || "";
  const promptText = defaultName
    ? `Enter project name (default: "${defaultName}"): `
    : "Enter project name: ";

  rl.question(promptText, (inputName) => {
    const projectNameInput = inputName.trim() || defaultName;

    if (!projectNameInput) {
      console.log("❌ Project name cannot be empty!");
      rl.close();
      return;
    }

    const validation = validateProjectName(projectNameInput);

    if (!validation.valid) {
      console.log(`❌ ${validation.error}`);
      rl.close();
      return;
    }

    const sanitizedName = validation.sanitized;
    const originalName = projectNameInput;

    if (sanitizedName !== originalName) {
      console.log(
        `📝 Project name sanitized: "${originalName}" → "${sanitizedName}"`
      );
    }

    console.log(`\n🔍 Searching for files to replace in Sources folder...`);

    const currentDir = process.cwd();
    const sourcesDir = path.join(currentDir, "Sources");

    if (!fs.existsSync(sourcesDir)) {
      console.log("❌ Sources folder not found!");
      rl.close();
      return;
    }

    const files = findFiles(sourcesDir);

    console.log(`📁 Found ${files.length} files to check`);

    let processedFiles = 0;
    let modifiedFiles = 0;

    for (const file of files) {
      processedFiles++;
      if (replaceInFile(file, sanitizedName, originalName, config)) {
        modifiedFiles++;
      }
    }

    console.log(`\n✨ Done!`);
    console.log(`📊 Files processed: ${processedFiles}`);
    console.log(`🔄 Files modified: ${modifiedFiles}`);
    console.log(`🎯 vite-app-template → ${sanitizedName.toLowerCase()}`);
    console.log(`🎯 VITE_APP_TEMPLATE → ${originalName}`);

    if (configKeys.length > 0) {
      console.log(`🎯 Config variables replaced: ${configKeys.length}`);
    }

    rl.close();
  });
}

main();
