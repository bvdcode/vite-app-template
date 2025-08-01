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

function replaceInFile(filePath, sanitizedName, originalName) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    // Заменяем vite-app-template на санитизированную версию в нижнем регистре
    if (content.includes("vite-app-template")) {
      content = content.replace(/vite-app-template/g, sanitizedName.toLowerCase());
      modified = true;
    }

    // Заменяем VITE_APP_TEMPLATE на оригинальное имя (только trim)
    if (content.includes("VITE_APP_TEMPLATE")) {
      content = content.replace(/VITE_APP_TEMPLATE/g, originalName.trim());
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
  // Заменяем все что не буквы/цифры на тире
  let sanitized = projectName.replace(/[^a-zA-Z0-9]/g, "-");
  
  // Убираем дублирующиеся тире
  sanitized = sanitized.replace(/-+/g, "-");
  
  // Убираем тире в начале и конце
  sanitized = sanitized.replace(/^-+|-+$/g, "");
  
  return sanitized;
}

function validateProjectName(projectName) {
  // Проверяем что имя не пустое
  if (!projectName.trim()) {
    return { valid: false, error: "Project name cannot be empty!" };
  }
  
  // Санитизируем имя
  const sanitized = sanitizeProjectName(projectName.trim());
  
  // Проверяем что после санитизации что-то осталось
  if (!sanitized) {
    return { valid: false, error: "Project name contains only invalid characters!" };
  }
  
  // Проверяем что имя не состоит только из тире
  if (sanitized === "-" || sanitized.match(/^-+$/)) {
    return { valid: false, error: "Project name cannot consist only of dashes!" };
  }
  
  // Проверяем что имя начинается с буквы
  if (!sanitized.match(/^[a-zA-Z]/)) {
    return { valid: false, error: "Project name must start with a letter!" };
  }
  
  // Проверяем минимальную длину (хотя бы 2 символа)
  if (sanitized.length < 2) {
    return { valid: false, error: "Project name must be at least 2 characters long!" };
  }
  
  // Проверяем максимальную длину (не больше 50 символов)
  if (sanitized.length > 50) {
    return { valid: false, error: "Project name must be no more than 50 characters long!" };
  }
  
  return { valid: true, sanitized };
}

function main() {
  rl.question("Enter project name: ", (inputName) => {
    const validation = validateProjectName(inputName);
    
    if (!validation.valid) {
      console.log(`❌ ${validation.error}`);
      rl.close();
      return;
    }
    
    const sanitizedName = validation.sanitized;
    const originalName = inputName.trim();
    
    if (sanitizedName !== originalName) {
      console.log(
        `📝 Project name sanitized: "${originalName}" → "${sanitizedName}"`
      );
    }

    console.log(`\n🔍 Searching for files to replace in Sources folder...`);

    const currentDir = process.cwd();
    const sourcesDir = path.join(currentDir, "Sources");
    
    // Проверяем что папка Sources существует
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
      if (replaceInFile(file, sanitizedName, originalName)) {
        modifiedFiles++;
      }
    }

    console.log(`\n✨ Done!`);
    console.log(`📊 Files processed: ${processedFiles}`);
    console.log(`🔄 Files modified: ${modifiedFiles}`);
    console.log(`🎯 vite-app-template → ${sanitizedName.toLowerCase()}`);
    console.log(`🎯 VITE_APP_TEMPLATE → ${originalName}`);

    rl.close();
  });
}

main();
