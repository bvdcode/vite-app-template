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
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (
        ![
          "node_modules",
          ".git",
          "dist",
          "build",
          path.basename(__filename),
        ].includes(file)
      ) {
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
      console.log(`✅ Обновлен: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Ошибка при обработке файла ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  rl.question("Введите имя проекта: ", (projectName) => {
    if (!projectName.trim()) {
      console.log("❌ Имя проекта не может быть пустым!");
      rl.close();
      return;
    }

    console.log(`\n🔍 Поиск файлов для замены...`);

    const currentDir = process.cwd();
    const files = findFiles(currentDir);

    console.log(`📁 Найдено ${files.length} файлов для проверки`);

    let processedFiles = 0;
    let modifiedFiles = 0;

    for (const file of files) {
      processedFiles++;
      if (replaceInFile(file, projectName.trim())) {
        modifiedFiles++;
      }
    }

    console.log(`\n✨ Готово!`);
    console.log(`📊 Обработано файлов: ${processedFiles}`);
    console.log(`🔄 Изменено файлов: ${modifiedFiles}`);
    console.log(`🎯 Проект переименован в: ${projectName.trim()}`);

    rl.close();
  });
}

main();
