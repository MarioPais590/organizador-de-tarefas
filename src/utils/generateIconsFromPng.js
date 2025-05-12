// Script para gerar ícones do PWA a partir de uma imagem PNG
// Este script usa sharp para redimensionar uma imagem para os tamanhos necessários para o PWA
// Para usar: node generateIconsFromPng.js

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Obter o diretório atual em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tamanhos de ícones necessários para o PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Diretório de saída para os ícones
const outputDir = path.join(__dirname, '../../public/icons');

// Função principal
async function generateIcons() {
  console.log('Gerando ícones para PWA a partir da imagem enviada...');
  
  // Verificar se o diretório de saída existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Diretório criado: ${outputDir}`);
  }
  
  try {
    // Usar a imagem enviada pelo usuário
    const inputImagePath = path.join(__dirname, '../../public/task-manager-icon.png');
    
    // Gerar ícones regulares
    for (const size of iconSizes) {
      await sharp(inputImagePath)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
      
      console.log(`Ícone gerado: icon-${size}x${size}.png`);
    }
    
    // Gerar ícone maskable (com padding para área segura)
    await sharp(inputImagePath)
      .resize({
        width: 512,
        height: 512,
        fit: 'contain',
        background: { r: 103, g: 58, b: 183, alpha: 1 } // Cor de fundo #673AB7 (roxo)
      })
      .png()
      .toFile(path.join(outputDir, 'maskable-icon-512x512.png'));
    
    console.log('Ícone maskable gerado: maskable-icon-512x512.png');
    
    console.log('Todos os ícones foram gerados com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar ícones:', error);
  }
}

// Executar a função principal
generateIcons().catch(console.error); 