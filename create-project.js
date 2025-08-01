const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Создаем интерфейс для чтения пользовательского ввода
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Функция для рекурсивного поиска файлов
function findFiles(dir, extensions = ['.json', '.html', '.md', '.js', '.ts', '.tsx']) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Пропускаем node_modules и другие служебные папки
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext) || file === 'README.md') {
        results.push(filePath);
      }
    }
  }
  
  return results;
}

// Функция для замены строк в файле
function replaceInFile(filePath, projectName) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Заменяем vite-app-template на имя проекта в нижнем регистре
    const lowerCaseName = projectName.toLowerCase();
    if (content.includes('vite-app-template')) {
      content = content.replace(/vite-app-template/g, lowerCaseName);
      modified = true;
    }
    
    // Заменяем VITE_APP_TEMPLATE на оригинальное имя проекта
    if (content.includes('VITE_APP_TEMPLATE')) {
      content = content.replace(/VITE_APP_TEMPLATE/g, projectName);
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Обновлен: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Ошибка при обработке файла ${filePath}:`, error.message);
    return false;
  }
}

// Основная функция
function main() {
  rl.question('Введите имя проекта: ', (projectName) => {
    if (!projectName.trim()) {
      console.log('❌ Имя проекта не может быть пустым!');
      rl.close();
      return;
    }
    
    console.log(`\n🔍 Поиск файлов для замены...`);
    
    // Ищем файлы в текущей директории
    const currentDir = process.cwd();
    const files = findFiles(currentDir);
    
    console.log(`📁 Найдено ${files.length} файлов для проверки`);
    
    let processedFiles = 0;
    let modifiedFiles = 0;
    
    // Обрабатываем каждый файл
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

// Запускаем скрипт
main();