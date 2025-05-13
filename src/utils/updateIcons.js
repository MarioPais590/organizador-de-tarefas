/**
 * Script para atualizar os ícones do PWA
 * 
 * Este script gera ícones de diferentes tamanhos a partir de uma imagem base.
 * Ele é útil para criar todos os ícones necessários para um PWA.
 * 
 * Uso:
 * 1. Coloque uma imagem base de alta resolução (pelo menos 512x512) em public/base-icon.png
 * 2. Execute este script com: node src/utils/updateIcons.js
 * 3. Os ícones serão gerados na pasta public/icons/
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Tamanhos de ícones necessários para PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Caminho para a imagem base
const baseIconPath = path.join(__dirname, '../../public/base-icon.png');

// Diretório de saída para os ícones
const outputDir = path.join(__dirname, '../../public/icons');

// Criar diretório de saída se não existir
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Diretório ${outputDir} criado com sucesso.`);
}

/**
 * Gera um ícone de um tamanho específico
 * @param {string} inputPath Caminho para a imagem de entrada
 * @param {string} outputPath Caminho para a imagem de saída
 * @param {number} size Tamanho do ícone em pixels
 * @returns {Promise<void>}
 */
async function generateIcon(inputPath, outputPath, size) {
  try {
    await sharp(inputPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Ícone ${size}x${size} gerado com sucesso: ${outputPath}`);
  } catch (error) {
    console.error(`Erro ao gerar ícone ${size}x${size}:`, error);
  }
}

/**
 * Gera um ícone maskable (com área segura para recorte)
 * @param {string} inputPath Caminho para a imagem de entrada
 * @param {string} outputPath Caminho para a imagem de saída
 * @param {number} size Tamanho do ícone em pixels
 * @returns {Promise<void>}
 */
async function generateMaskableIcon(inputPath, outputPath, size) {
  try {
    // Criar um fundo branco com a imagem centralizada
    // Reduzir a imagem para 80% do tamanho para criar a área segura
    const imageSize = Math.floor(size * 0.8);
    const padding = Math.floor((size - imageSize) / 2);
    
    await sharp(inputPath)
      .resize(imageSize, imageSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    
    console.log(`Ícone maskable ${size}x${size} gerado com sucesso: ${outputPath}`);
  } catch (error) {
    console.error(`Erro ao gerar ícone maskable ${size}x${size}:`, error);
  }
}

/**
 * Função principal para gerar todos os ícones
 */
async function generateAllIcons() {
  try {
    if (!fs.existsSync(baseIconPath)) {
      console.error(`Erro: Arquivo base ${baseIconPath} não encontrado.`);
      console.log('Por favor, coloque uma imagem de alta resolução em public/base-icon.png');
      return;
    }
    
    // Verificar se a imagem base tem resolução suficiente
    const baseImage = sharp(baseIconPath);
    const metadata = await baseImage.metadata();
    
    if (metadata.width < 512 || metadata.height < 512) {
      console.warn(`Aviso: A imagem base tem apenas ${metadata.width}x${metadata.height} pixels.`);
      console.warn('Recomenda-se usar uma imagem de pelo menos 512x512 pixels para melhor qualidade.');
    }
    
    // Gerar ícones regulares
    for (const size of iconSizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      await generateIcon(baseIconPath, outputPath, size);
    }
    
    // Gerar ícone maskable
    const maskableOutputPath = path.join(outputDir, 'maskable-icon-512x512.png');
    await generateMaskableIcon(baseIconPath, maskableOutputPath, 512);
    
    console.log('Todos os ícones foram gerados com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar ícones:', error);
  }
}

// Executar o script
generateAllIcons(); 