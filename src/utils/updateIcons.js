// Script para atualizar os ícones do PWA usando as imagens enviadas pelo usuário
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Obter o diretório atual em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretórios
const publicDir = path.join(__dirname, '../../public');
const iconDir = path.join(publicDir, 'icons');
const sourceIconPath = path.join(publicDir, 'task-manager-icon.png');

// Função principal
async function updateIcons() {
  console.log('Atualizando ícones do PWA...');
  
  // Verificar se o diretório de ícones existe
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
    console.log(`Diretório criado: ${iconDir}`);
  }
  
  try {
    // Verificar se o ícone fonte existe
    if (!fs.existsSync(sourceIconPath)) {
      console.error(`Arquivo de ícone fonte não encontrado: ${sourceIconPath}`);
      console.error('Por favor, coloque o arquivo task-manager-icon.png na pasta public/');
      return;
    }
    
    // Gerar ícones em todos os tamanhos necessários
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const size of sizes) {
      await sharp(sourceIconPath)
        .resize(size, size)
        .png()
        .toFile(path.join(iconDir, `icon-${size}x${size}.png`));
      console.log(`Ícone gerado: icon-${size}x${size}.png`);
    }
    
    // Gerar ícone maskable
    await sharp(sourceIconPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconDir, 'maskable-icon-512x512.png'));
    console.log('Ícone maskable gerado: maskable-icon-512x512.png');
    
    // Gerar favicon.png (32x32)
    await sharp(sourceIconPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));
    console.log('Favicon gerado: favicon.png');
    
    // Criar favicon.ico (cópia do favicon.png)
    fs.copyFileSync(
      path.join(publicDir, 'favicon.png'),
      path.join(publicDir, 'favicon.ico')
    );
    console.log('Favicon.ico criado');
    
    // Atualizar a versão do cache no service worker
    const swPath = path.join(publicDir, 'sw.js');
    if (fs.existsSync(swPath)) {
      let swContent = fs.readFileSync(swPath, 'utf8');
      const cacheVersionRegex = /(const CACHE_NAME = ['"]organizador-tarefas-v)(\d+)(['"];)/;
      const match = swContent.match(cacheVersionRegex);
      
      if (match) {
        const currentVersion = parseInt(match[2], 10);
        const newVersion = currentVersion + 1;
        swContent = swContent.replace(
          cacheVersionRegex, 
          `$1${newVersion}$3`
        );
        fs.writeFileSync(swPath, swContent);
        console.log(`Service Worker atualizado: versão do cache incrementada para v${newVersion}`);
      }
    }
    
    console.log('Todos os ícones foram atualizados com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar ícones:', error);
  }
}

// Executar a função principal
updateIcons().catch(console.error); 