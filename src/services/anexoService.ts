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
    console.error("Erro ao salvar anexo:", error);
    return { 
      success: false, 
      message: `Erro desconhecido ao salvar o anexo "${anexo.nome}"` 
    };
  }
};

/**
 * Remove um anexo do banco de dados e sua vinculação com uma tarefa
 * @param anexoId ID do anexo a ser removido
 * @param tarefaId ID da tarefa vinculada
 * @param userId ID do usuário
 * @returns Booleano indicando sucesso da operação
 */
export const removerAnexoDoBanco = async (
  anexoId: string,
  tarefaId: string,
  userId: string
): Promise<boolean> => {
  try {
    // 1. Verificar se o anexo pertence ao usuário
    const { data: anexoData, error: anexoError } = await supabase
      .from('anexos')
      .select('id')
      .eq('id', anexoId)
      .eq('user_id', userId)
      .single();
    
    if (anexoError || !anexoData) {
      console.error("Erro ao verificar propriedade do anexo:", anexoError);
      return false;
    }
    
    // 2. Remover vínculo com a tarefa
    const { error: vinculoError } = await supabase
      .from('tarefa_anexos')
      .delete()
      .eq('anexo_id', anexoId)
      .eq('tarefa_id', tarefaId);
    
    if (vinculoError) {
      console.error("Erro ao remover vínculo do anexo:", vinculoError);
      return false;
    }
    
    // 3. Remover o anexo
    const { error: remocaoError } = await supabase
      .from('anexos')
      .delete()
      .eq('id', anexoId)
      .eq('user_id', userId);
    
    if (remocaoError) {
      console.error("Erro ao remover anexo:", remocaoError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao remover anexo:", error);
    return false;
  }
};

/**
 * Busca todos os anexos associados a uma tarefa
 * @param tarefaId ID da tarefa
 * @returns Array de anexos da tarefa
 */
export const buscarAnexosDaTarefa = async (tarefaId: string): Promise<Anexo[]> => {
  try {
    const { data, error } = await supabase
      .from('tarefa_anexos')
      .select(`
        anexo_id,
        anexos:anexo_id (*)
      `)
      .eq('tarefa_id', tarefaId);
    
    if (error) {
      console.error("Erro ao buscar anexos da tarefa:", error);
      return [];
    }
    
    // Transformar a resposta de uma forma mais segura para tipos
    if (!data || !Array.isArray(data)) return [];
    
    const anexos: Anexo[] = [];
    for (const item of data) {
      if (item.anexos && typeof item.anexos === 'object') {
        anexos.push({
          id: item.anexos.id || '',
          nome: item.anexos.nome || '',
          tipo: item.anexos.tipo || '',
          conteudo: item.anexos.conteudo || '',
          url: item.anexos.url
        });
      }
    }
    
    return anexos;
  } catch (error) {
    console.error("Erro ao buscar anexos:", error);
    return [];
  }
};

/**
 * Gera um ID temporário para anexos
 */
export const gerarIdTemporario = (): string => {
  return 'temp_' + Math.random().toString(36).substring(2, 11);
};

/**
 * Processa e comprime imagens para anexos
 */
export const processarImagem = async (
  file: File, 
  tipo: string, 
  callback: (anexo: Anexo) => void
): Promise<void> => {
  try {
    const img = new Image();
    const fileUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      // Criar canvas para redimensionar/comprimir a imagem
      const canvas = document.createElement('canvas');
      
      // Calcular dimensões mantendo proporção
      let width = img.width;
      let height = img.height;
      
      // Limitar tamanho máximo
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Desenhar imagem redimensionada no canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Não foi possível criar contexto de canvas para processamento de imagem");
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para Base64 com qualidade reduzida
      const qualidade = 0.85; // 85% de qualidade
      const base64 = canvas.toDataURL(`image/${tipo === 'jpg' ? 'jpeg' : tipo}`, qualidade);
      
      // Criar anexo
      const novoAnexo: Anexo = {
        id: gerarIdTemporario(),
        nome: file.name,
        tipo: tipo,
        conteudo: base64,
        url: fileUrl
      };
      
      callback(novoAnexo);
    };
    
    img.onerror = () => {
      toast.error("Erro ao carregar imagem. Verifique se o arquivo é válido.");
      throw new Error("Erro ao carregar imagem para processamento");
    };
    
    img.src = fileUrl;
  } catch (error) {
    console.error("Erro ao processar imagem:", error);
    toast.error("Erro ao processar a imagem. Tente novamente.");
    throw error;
  }
};

/**
 * Processa arquivos não-imagem para anexos (PDF, TXT, etc.)
 */
export const processarArquivo = async (
  file: File, 
  tipo: string, 
  callback: (anexo: Anexo) => void
): Promise<void> => {
  try {
    const fileUrl = URL.createObjectURL(file);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || typeof event.target.result !== 'string') {
        throw new Error("Erro ao ler conteúdo do arquivo");
      }
      
      const base64 = event.target.result;
      
      // Criar anexo
      const novoAnexo: Anexo = {
        id: gerarIdTemporario(),
        nome: file.name,
        tipo: tipo,
        conteudo: base64,
        url: fileUrl
      };
      
      callback(novoAnexo);
    };
    
    reader.onerror = () => {
      toast.error("Erro ao ler arquivo. Verifique se o arquivo é válido.");
      throw new Error("Erro ao ler arquivo para processamento");
    };
    
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Erro ao processar arquivo:", error);
    toast.error("Erro ao processar o arquivo. Tente novamente.");
    throw error;
  }
};

/**
 * Processa qualquer tipo de arquivo para anexo
 */
export const processarAnexo = async (
  file: File, 
  callback: (anexo: Anexo) => void
): Promise<void> => {
  try {
    // Verificar tamanho máximo (2MB)
    const fileSize = file.size / 1024 / 1024;
    if (fileSize > 2) {
      toast.error("O arquivo é muito grande. O tamanho máximo é de 2MB.");
      return;
    }
    
    // Verificar extensão do arquivo
    const extensao = file.name.split('.').pop()?.toLowerCase();
    if (!extensao || !['png', 'jpg', 'jpeg', 'pdf', 'txt', 'mp3'].includes(extensao)) {
      toast.error("Tipo de arquivo não suportado. Apenas PNG, JPG, PDF, TXT e MP3 são permitidos.");
      return;
    }
    
    // Determinar tipo de arquivo pela extensão
    const tipoAnexo = extensao === 'jpeg' ? 'jpg' : extensao;
    
    // Processar baseado no tipo
    if (tipoAnexo === 'png' || tipoAnexo === 'jpg') {
      await processarImagem(file, tipoAnexo, callback);
    } else {
      await processarArquivo(file, tipoAnexo, callback);
    }
  } catch (error) {
    console.error("Erro ao processar anexo:", error);
  }
};

/**
 * Adiciona um anexo à lista de anexos em memória
 */
export const adicionarAnexoEmMemoria = (
  anexos: Anexo[], 
  novoAnexo: Anexo
): Anexo[] => {
  return [...anexos, novoAnexo];
};

/**
 * Atualiza um anexo específico na lista em memória
 */
export const atualizarAnexoEmMemoria = (
  anexos: Anexo[], 
  anexoId: string, 
  novoNome: string
): Anexo[] => {
  return anexos.map(a => {
    if (a.id === anexoId) {
      return { ...a, nome: novoNome };
    }
    return a;
  });
};

/**
 * Remove um anexo da lista em memória
 */
export const removerAnexoEmMemoria = (
  anexos: Anexo[], 
  anexoId: string
): Anexo[] => {
  return anexos.filter(a => a.id !== anexoId);
}; 