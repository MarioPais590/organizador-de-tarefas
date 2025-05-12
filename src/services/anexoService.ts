import { Anexo } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Valida um anexo antes de salvar
 * @param anexo Anexo a ser validado
 * @returns Objeto contendo o resultado da validação e mensagem de erro
 */
export const validarAnexo = (anexo: Anexo): { valido: boolean, mensagem?: string } => {
  try {
    // Verificar se o conteúdo existe
    if (!anexo.conteudo) {
      return { 
        valido: false, 
        mensagem: `O anexo "${anexo.nome}" está vazio.` 
      };
    }
    
    // Verificar se é um base64 válido
    if (typeof anexo.conteudo !== 'string' || !anexo.conteudo.includes('base64')) {
      return { 
        valido: false, 
        mensagem: `O anexo "${anexo.nome}" está em formato inválido.` 
      };
    }
    
    // Verificar tamanho
    const base64Content = anexo.conteudo.split(',')[1] || '';
    const sizeInMB = (base64Content.length * 3/4) / (1024 * 1024);
    
    if (sizeInMB > 1) {
      return { 
        valido: false, 
        mensagem: `O anexo "${anexo.nome}" é muito grande (${sizeInMB.toFixed(2)}MB).` 
      };
    }
    
    return { valido: true };
  } catch (error) {
    console.error("Erro ao validar anexo:", error);
    return { 
      valido: false, 
      mensagem: `Erro desconhecido ao validar o anexo "${anexo.nome}".` 
    };
  }
};

/**
 * Utilitário para comprimir o conteúdo de anexos muito grandes
 * @param anexo O anexo a ser comprimido
 * @returns O anexo com conteúdo comprimido, se necessário
 */
export const comprimirAnexoSeNecessario = async (anexo: Anexo): Promise<Anexo> => {
  try {
    // Verificar se o conteúdo existe e é grande
    if (!anexo.conteudo) return anexo;
    
    // Extrair base64 e verificar tamanho
    const partes = anexo.conteudo.split(',');
    const header = partes[0];
    const base64Content = partes[1] || '';
    const sizeInMB = (base64Content.length * 3/4) / (1024 * 1024);
    
    // Se o tamanho for menor que 0.8MB, não comprimir
    if (sizeInMB < 0.8) return anexo;
    
    console.log(`Anexo grande detectado: ${anexo.nome} (${sizeInMB.toFixed(2)}MB). Tentando comprimir.`);
    
    // Comprimir apenas imagens
    if (anexo.tipo === 'jpg' || anexo.tipo === 'png') {
      return await comprimirImagemAnexo(anexo, header, base64Content);
    }
    
    // Para outros tipos, retorna o original com aviso
    console.warn(`Não é possível comprimir anexo do tipo: ${anexo.tipo}`);
    return anexo;
  } catch (error) {
    console.error("Erro ao comprimir anexo:", error);
    return anexo; // Em caso de erro, retorna o original
  }
};

/**
 * Comprime uma imagem anexada reduzindo sua qualidade e tamanho
 * @param anexo O anexo de imagem a ser comprimido
 * @param header Cabeçalho do data URL
 * @param base64Content Conteúdo base64 da imagem
 * @returns O anexo com a imagem comprimida
 */
export const comprimirImagemAnexo = (anexo: Anexo, header: string, base64Content: string): Promise<Anexo> => {
  return new Promise((resolve) => {
    try {
      // Criar uma imagem a partir do conteúdo
      const img = new Image();
      
      img.onload = () => {
        try {
          // Criar canvas para redimensionar
          const canvas = document.createElement('canvas');
          
          // Calcular novas dimensões mantendo proporção
          let width = img.width;
          let height = img.height;
          
          // Se a imagem for muito grande, reduzir ainda mais
          const fatorReducao = base64Content.length > 2000000 ? 0.5 : 0.7;
          
          // Limitar tamanho máximo
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          
          // Configurar canvas
          canvas.width = width;
          canvas.height = height;
          
          // Desenhar imagem no canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error("Erro ao obter contexto 2D do canvas");
            resolve(anexo); // Em caso de erro, retornar original
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Qualidade de compressão baseada no tamanho original
          const qualidade = base64Content.length > 1000000 ? 0.5 : 0.7;
          
          // Converter para data URL com qualidade reduzida
          const dataUrl = canvas.toDataURL(
            `image/${anexo.tipo === 'jpg' ? 'jpeg' : anexo.tipo}`, 
            qualidade
          );
          
          // Verificar o novo tamanho
          const novoConteudo = dataUrl.split(',')[1] || '';
          const novoTamanho = (novoConteudo.length * 3/4) / (1024 * 1024);
          
          console.log(`Anexo comprimido: ${anexo.nome} - Tamanho original: ${(base64Content.length * 3/4 / (1024 * 1024)).toFixed(2)}MB, Novo tamanho: ${novoTamanho.toFixed(2)}MB`);
          
          // Retornar anexo com conteúdo comprimido
          resolve({
            ...anexo,
            conteudo: dataUrl
          });
        } catch (canvasError) {
          console.error("Erro ao processar canvas:", canvasError);
          resolve(anexo); // Em caso de erro, retornar original
        }
      };
      
      img.onerror = () => {
        console.error("Erro ao carregar imagem para compressão");
        resolve(anexo); // Em caso de erro, retornar original
      };
      
      // Configurar fonte da imagem
      img.src = `${header},${base64Content}`;
    } catch (error) {
      console.error("Erro ao iniciar compressão de imagem:", error);
      resolve(anexo); // Em caso de erro, retornar original
    }
  });
};

/**
 * Salva um anexo no banco de dados e o vincula a uma tarefa
 * @param anexo Anexo a ser salvo
 * @param tarefaId ID da tarefa a vincular o anexo
 * @param userId ID do usuário
 * @returns Objeto com resultado do salvamento
 */
export const salvarAnexo = async (
  anexo: Anexo, 
  tarefaId: string, 
  userId: string
): Promise<{ success: boolean, message: string, id?: string }> => {
  try {
    console.log(`Processando anexo: ${anexo.nome} (${anexo.tipo})`);

    // Verificar tipo do anexo baseado na extensão do arquivo
    const extensao = anexo.nome.split('.').pop()?.toLowerCase();
    if (extensao && anexo.tipo !== extensao && !(extensao === 'jpeg' && anexo.tipo === 'jpg')) {
      console.warn(`Corrigindo tipo do anexo: "${anexo.nome}" de ${anexo.tipo} para ${extensao}`);
      anexo.tipo = extensao === 'jpeg' ? 'jpg' : extensao;
    }
    
    // Comprimir anexo se necessário
    const anexoProcessado = await comprimirAnexoSeNecessario(anexo);
    
    // 1. Inserir o anexo
    const { data: anexoData, error: anexoError } = await supabase
      .from('anexos')
      .insert({
        nome: anexoProcessado.nome,
        tipo: anexoProcessado.tipo,
        conteudo: anexoProcessado.conteudo,
        user_id: userId
      })
      .select('id')
      .single();
    
    if (anexoError) {
      console.error("Erro ao inserir anexo:", anexoError);
      return { 
        success: false, 
        message: anexoError.message.includes('413') 
          ? `O anexo "${anexo.nome}" é muito grande para ser salvo.`
          : `Erro ao salvar o anexo "${anexo.nome}". Tente novamente.`
      };
    }
    
    if (!anexoData?.id) {
      console.error("ID do anexo não retornado após inserção");
      return { success: false, message: `Erro ao inserir anexo "${anexo.nome}"` };
    }
    
    // 2. Vincular o anexo à tarefa
    const { error: vinculoError } = await supabase
      .from('tarefa_anexos')
      .insert({
        tarefa_id: tarefaId,
        anexo_id: anexoData.id
      });
    
    if (vinculoError) {
      console.error("Erro ao vincular anexo à tarefa:", vinculoError);
      return { success: false, message: `Erro ao vincular anexo "${anexo.nome}" à tarefa` };
    }
    
    console.log(`Anexo ${anexo.nome} vinculado com sucesso à tarefa ${tarefaId}`);
    return { 
      success: true, 
      message: `Anexo "${anexo.nome}" salvo com sucesso`,
      id: anexoData.id
    };
  } catch (error) {
    console.error("Erro ao processar anexo:", error);
    return { success: false, message: `Erro desconhecido ao processar anexo "${anexo.nome}"` };
  }
};

/**
 * Remove um anexo do banco de dados
 * @param anexoId ID do anexo a ser removido
 * @param tarefaId ID da tarefa associada ao anexo
 * @param userId ID do usuário
 * @returns true se a operação foi bem-sucedida
 */
export const removerAnexo = async (
  anexoId: string,
  tarefaId: string,
  userId: string
): Promise<boolean> => {
  try {
    // 1. Remover associação na tabela tarefa_anexos
    const { error: errorDesvinculo } = await supabase
      .from('tarefa_anexos')
      .delete()
      .eq('anexo_id', anexoId)
      .eq('tarefa_id', tarefaId);
    
    if (errorDesvinculo) {
      console.error("Erro ao desvincular anexo:", errorDesvinculo);
      return false;
    }
    
    // 2. Excluir o anexo da tabela anexos
    const { error: errorExclusao } = await supabase
      .from('anexos')
      .delete()
      .eq('id', anexoId)
      .eq('user_id', userId);
    
    if (errorExclusao) {
      console.error("Erro ao excluir anexo:", errorExclusao);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao remover anexo:", error);
    return false;
  }
};

/**
 * Busca os anexos de uma tarefa
 * @param tarefaId ID da tarefa
 * @returns Array com os anexos da tarefa
 */
export const buscarAnexosDaTarefa = async (tarefaId: string): Promise<Anexo[]> => {
  try {
    const { data: anexosData, error } = await supabase
      .from('tarefa_anexos')
      .select(`
        anexos(*)
      `)
      .eq('tarefa_id', tarefaId);
    
    if (error) {
      console.error("Erro ao buscar anexos da tarefa:", error);
      return [];
    }
    
    return anexosData ? anexosData.map(item => item.anexos) : [];
  } catch (error) {
    console.error("Erro ao buscar anexos:", error);
    return [];
  }
}; 