// Script para gerar ícones do PWA
// Este script usa sharp para redimensionar uma imagem base para os tamanhos necessários para o PWA
// Para usar: node generateIcons.js <caminho-para-imagem-base>

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
async function generateIcons(inputImagePath) {
  console.log('Gerando ícones para PWA...');
  
  // Verificar se o diretório de saída existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Diretório criado: ${outputDir}`);
  }
  
  try {
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
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .composite([{
        input: Buffer.from(`
          <svg>
            <circle cx="256" cy="256" r="256" fill="#3a86ff" fill-opacity="0.2"/>
          </svg>
        `),
        blend: 'over'
      }])
      .png()
      .toFile(path.join(outputDir, 'maskable-icon-512x512.png'));
    
    console.log('Ícone maskable gerado: maskable-icon-512x512.png');
    
    console.log('Todos os ícones foram gerados com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar ícones:', error);
  }
}

// Verificar argumentos da linha de comando
const inputImagePath = process.argv[2];
if (!inputImagePath) {
  console.error('Por favor, forneça o caminho para a imagem base.');
  console.error('Uso: node generateIcons.js <caminho-para-imagem-base>');
  process.exit(1);
}

// Verificar se o arquivo existe
if (!fs.existsSync(inputImagePath)) {
  console.error(`Arquivo não encontrado: ${inputImagePath}`);
  process.exit(1);
}

// Executar a função principal
generateIcons(inputImagePath).catch(console.error); 