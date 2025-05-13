// Script para baixar as imagens enviadas pelo usuário
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Obter o diretório atual em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório temporário para os ícones
const tempDir = path.join(__dirname, '../../public/temp_icons');

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

// Função principal
async function downloadUserIcons() {
  console.log('Baixando ícones enviados pelo usuário...');
  
  // Verificar se o diretório temporário existe
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Diretório temporário criado: ${tempDir}`);
  }
  
  try {
    // URLs das imagens enviadas pelo usuário
    const imageUrls = {
      'icon-512x512.png': 'https://i.imgur.com/2Zq0Qz0.png'
    };
    
    // Baixar todas as imagens
    for (const [filename, url] of Object.entries(imageUrls)) {
      await downloadImage(url, path.join(tempDir, filename));
    }
    
    console.log('Todos os ícones foram baixados com sucesso!');
  } catch (error) {
    console.error('Erro ao baixar ícones:', error);
  }
}

// Executar a função principal
downloadUserIcons().catch(console.error); 