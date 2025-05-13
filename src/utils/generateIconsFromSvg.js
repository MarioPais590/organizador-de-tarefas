/**
 * Script para gerar ícones PNG a partir de um SVG
 * 
 * Este script converte o arquivo SVG em ícones PNG de diferentes tamanhos
 * para uso no PWA.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Obter diretório atual em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tamanhos de ícones necessários para PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Caminho para a imagem SVG base
const baseSvgPath = path.join(__dirname, '../../public/task-manager-icon.svg');

// Diretório de saída para os ícones
const outputDir = path.join(__dirname, '../../public');

// Função para converter SVG para PNG
async function convertSvgToPng(inputPath, outputPath, size) {
  try {
    await sharp(inputPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Ícone ${size}x${size} gerado com sucesso: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Erro ao gerar ícone ${size}x${size}:`, error);
    return false;
  }
}

// Função principal
async function generateIcons() {
  try {
    if (!fs.existsSync(baseSvgPath)) {
      console.error(`Arquivo SVG base não encontrado: ${baseSvgPath}`);
      return false;
    }
    
    // Gerar o ícone principal
    const mainIconPath = path.join(outputDir, 'task-manager-icon.png');
    await convertSvgToPng(baseSvgPath, mainIconPath, 512);
    
    console.log('Ícone principal gerado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao gerar ícones:', error);
    return false;
  }
}

// Executar o script
generateIcons()
  .then(success => {
    if (success) {
      console.log('Processo de geração de ícones concluído com sucesso!');
    } else {
      console.error('Houve erros durante a geração de ícones.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erro fatal durante a geração de ícones:', error);
    process.exit(1);
  }); 