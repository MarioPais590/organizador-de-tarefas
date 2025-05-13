// Script para processar os ícones enviados pelo usuário
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Obter o diretório atual em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório de saída para os ícones
const outputDir = path.join(__dirname, '../../public/icons');
const publicDir = path.join(__dirname, '../../public');
const tempDir = path.join(publicDir, 'temp_icons');

// Função principal
async function processIcons() {
  console.log('Processando ícones do PWA...');
  
  // Verificar se o diretório de saída existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Diretório criado: ${outputDir}`);
  }
  
  // Verificar se o diretório temporário existe
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Diretório temporário criado: ${tempDir}`);
  }
  
  try {
    // Copiar todas as imagens enviadas para a pasta de ícones
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    // Usar a imagem de 512x512 para todos os tamanhos
    const sourceImage = path.join(tempDir, 'icon-512x512.png');
    
    // Gerar todos os tamanhos de ícones
    for (const size of sizes) {
      await sharp(sourceImage)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
      console.log(`Ícone gerado: icon-${size}x${size}.png`);
    }
    
    // Gerar ícone maskable
    await sharp(sourceImage)
      .resize(512, 512)
      .png()
      .toFile(path.join(outputDir, 'maskable-icon-512x512.png'));
    console.log('Ícone maskable gerado: maskable-icon-512x512.png');
    
    // Gerar favicon.png (32x32)
    await sharp(sourceImage)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));
    console.log('Favicon gerado: favicon.png');
    
    // Gerar favicon.ico (16x16, 32x32, 48x48)
    // Nota: Para gerar um favicon.ico completo, precisaríamos de uma biblioteca adicional
    // Por enquanto, vamos apenas copiar o favicon.png como favicon.ico
    fs.copyFileSync(
      path.join(publicDir, 'favicon.png'),
      path.join(publicDir, 'favicon.ico')
    );
    console.log('Favicon.ico copiado');
    
    console.log('Todos os ícones foram processados com sucesso!');
  } catch (error) {
    console.error('Erro ao processar ícones:', error);
  }
}

// Executar a função principal
processIcons().catch(console.error); 