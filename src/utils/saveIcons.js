// Script para salvar os ícones enviados pelo usuário
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Obter o diretório atual em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório de saída para os ícones
const outputDir = path.join(__dirname, '../../public/icons');
const publicDir = path.join(__dirname, '../../public');

// Função para baixar uma imagem
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Falha ao baixar a imagem. Status: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Imagem salva em: ${filepath}`);
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Remover arquivo parcial
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Função para redimensionar uma imagem
async function resizeImage(inputPath, outputPath, width, height) {
  try {
    await sharp(inputPath)
      .resize(width, height)
      .png()
      .toFile(outputPath);
    console.log(`Imagem redimensionada: ${outputPath}`);
  } catch (error) {
    console.error(`Erro ao redimensionar imagem ${outputPath}:`, error);
    throw error;
  }
}

// Função principal
async function saveIcons() {
  console.log('Processando ícones do PWA...');
  
  // Verificar se o diretório de saída existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Diretório criado: ${outputDir}`);
  }
  
  try {
    // URLs das imagens enviadas pelo usuário
    const imageUrls = [
      'https://i.imgur.com/2Zq0Qz0.png', // 512x512
      'https://i.imgur.com/2Zq0Qz0.png', // 192x192 (usaremos a mesma e redimensionaremos)
    ];
    
    // Baixar a imagem principal (512x512)
    const tempFile512 = path.join(publicDir, 'temp-512x512.png');
    await downloadImage(imageUrls[0], tempFile512);
    
    // Gerar todos os tamanhos de ícones
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const size of sizes) {
      await resizeImage(
        tempFile512, 
        path.join(outputDir, `icon-${size}x${size}.png`), 
        size, 
        size
      );
    }
    
    // Gerar ícone maskable
    await resizeImage(
      tempFile512, 
      path.join(outputDir, 'maskable-icon-512x512.png'), 
      512, 
      512
    );
    
    // Gerar favicon.png (32x32)
    await resizeImage(
      tempFile512, 
      path.join(publicDir, 'favicon.png'), 
      32, 
      32
    );
    
    // Limpar arquivos temporários
    fs.unlinkSync(tempFile512);
    
    console.log('Todos os ícones foram processados com sucesso!');
  } catch (error) {
    console.error('Erro ao processar ícones:', error);
  }
}

// Executar a função principal
saveIcons().catch(console.error); 