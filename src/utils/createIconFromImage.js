/**
 * Utilitário para criar ícones a partir de uma imagem
 * Esta é uma versão simplificada do utilitário original que foi removido
 */

// Função para criar um ícone a partir de uma imagem
export function createIconFromImage(imageElement, size = 512) {
  // Criar um canvas para desenhar a imagem
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  // Obter o contexto e desenhar a imagem
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    console.error('Não foi possível obter o contexto 2D do canvas');
    return null;
  }
  
  // Desenhar com um fundo branco para transparência
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  
  // Calcular dimensões para manter a proporção
  let destWidth = size;
  let destHeight = size;
  let destX = 0;
  let destY = 0;
  
  // Ajustar a proporção se a imagem não for quadrada
  if (imageElement.width > imageElement.height) {
    destHeight = (imageElement.height / imageElement.width) * size;
    destY = (size - destHeight) / 2;
  } else if (imageElement.height > imageElement.width) {
    destWidth = (imageElement.width / imageElement.height) * size;
    destX = (size - destWidth) / 2;
  }
  
  // Desenhar a imagem no canvas
  ctx.drawImage(imageElement, destX, destY, destWidth, destHeight);
  
  // Retornar a URL de dados do canvas
  return canvas.toDataURL('image/png');
}

// Função para criar vários tamanhos de ícones
export function createMultipleSizeIcons(imageElement, sizes = [72, 96, 128, 144, 152, 192, 384, 512]) {
  return sizes.map(size => ({
    size,
    url: createIconFromImage(imageElement, size)
  }));
}

export default createIconFromImage; 