import { Tarefa, Categoria, Anexo } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validarAnexo, salvarAnexo, removerAnexo, buscarAnexosDaTarefa } from './anexoService';

/**
 * Utilitário para comprimir o conteúdo de anexos muito grandes
 * @param anexo O anexo a ser comprimido
 * @returns O anexo com conteúdo comprimido, se necessário
 */
const comprimirAnexoSeNecessario = async (anexo: Anexo): Promise<Anexo> => {
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
const comprimirImagemAnexo = (anexo: Anexo, header: string, base64Content: string): Promise<Anexo> => {
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
 * Busca todas as tarefas do usuário com suas categorias e anexos
 * @param userId ID do usuário logado
 * @returns Array de tarefas com dados completos
 */
export const buscarTarefas = async (userId: string): Promise<Tarefa[]> => {
  try {
    // Carregar tarefas com categorias
    const { data: tarefasData, error: tarefasError } = await supabase
      .from('tarefas')
      .select(`
        *,
        categoria:categorias(*)
      `)
      .eq('user_id', userId);
    
    if (tarefasError) throw tarefasError;
    
    if (!tarefasData || tarefasData.length === 0) {
      return [];
    }
    
    // Buscar anexos para cada tarefa
    const tarefasComAnexos = await Promise.all(tarefasData.map(async (tarefa) => {
      const anexos = await buscarAnexosDaTarefa(tarefa.id);
      
      return {
        id: tarefa.id,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || undefined,
        dataCriacao: new Date(tarefa.data_criacao),
        data: tarefa.data,
        hora: tarefa.hora || undefined,
        categoria: {
          id: tarefa.categoria.id,
          nome: tarefa.categoria.nome,
          cor: tarefa.categoria.cor
        },
        prioridade: tarefa.prioridade as 'baixa' | 'media' | 'alta',
        concluida: tarefa.concluida,
        anexos: anexos,
        notificar: tarefa.notificar !== undefined ? 
          (tarefa.notificar !== null ? tarefa.notificar : true) : 
          true
      };
    }));
    
    return tarefasComAnexos;
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    toast.error("Erro ao buscar suas tarefas");
    return [];
  }
};

/**
 * Adiciona uma nova tarefa no banco de dados
 * @param tarefa Dados da tarefa a ser adicionada
 * @param userId ID do usuário logado
 * @returns ID da tarefa criada em caso de sucesso, null em caso de erro
 */
export const adicionarTarefa = async (
  tarefa: Omit<Tarefa, 'id' | 'dataCriacao'> & { anexos?: Anexo[] },
  userId: string
): Promise<string | null> => {
  try {
    console.log("Iniciando adição de tarefa", { 
      titulo: tarefa.titulo, 
      anexos: tarefa.anexos?.length || 0,
      categoria: tarefa.categoria?.id || 'sem categoria'
    });
    
    // Verificar anexos antes de prosseguir
    if (tarefa.anexos && tarefa.anexos.length > 0) {
      console.log(`Verificando ${tarefa.anexos.length} anexos antes de criar a tarefa`);
      
      // Validar todos os anexos
      for (const anexo of tarefa.anexos) {
        const resultado = validarAnexo(anexo);
        if (!resultado.valido) {
          console.error(`Validação falhou para anexo ${anexo.nome}: ${resultado.mensagem}`);
          toast.error(resultado.mensagem);
          return null;
        }
      }
    }
    
    // Dados para inserir no Supabase - adicionando ANTES de processar anexos
    // para não atrasar a criação da tarefa principal
    const novaTarefa = {
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      data: tarefa.data,
      hora: tarefa.hora,
      categoria_id: tarefa.categoria.id,
      prioridade: tarefa.prioridade,
      concluida: tarefa.concluida,
      notificar: tarefa.notificar !== undefined ? tarefa.notificar : true,
      user_id: userId,
      data_criacao: new Date().toISOString()
    };
    
    // Adicionar tarefa no Supabase PRIMEIRO
    console.log("Salvando tarefa básica sem anexos primeiro");
    const { data, error } = await supabase
      .from('tarefas')
      .insert(novaTarefa)
      .select('id')
      .single();
    
    if (error) {
      console.error("Erro ao inserir tarefa:", error);
      throw error;
    }
    
    if (!data?.id) {
      console.error("ID da tarefa não retornado após inserção");
      throw new Error("ID da tarefa não retornado");
    }
    
    const tarefaId = data.id;
    console.log("Tarefa criada com ID:", tarefaId);
    
    // Se não houver anexos, retornar o ID da tarefa
    if (!tarefa.anexos || tarefa.anexos.length === 0) {
      return tarefaId;
    }
    
    // Processo de anexos separado da criação principal da tarefa
    try {
      // Processamento em paralelo de todos os anexos para acelerar
      const resultadosAnexos = await Promise.allSettled(
        tarefa.anexos.map(anexo => salvarAnexo(anexo, tarefaId, userId))
      );
      
      // Verificar resultados e mostrar mensagens apropriadas
      const sucessos = resultadosAnexos.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
      const falhas = resultadosAnexos.filter(r => r.status === 'rejected' || !(r.status === 'fulfilled' && (r.value as any).success)).length;
      
      if (sucessos === 0 && falhas > 0) {
        toast.error(`Tarefa criada, mas houve problemas ao salvar ${falhas} anexo(s).`);
      } else if (sucessos > 0 && falhas > 0) {
        toast.warning(`Tarefa criada com ${sucessos} anexo(s), mas ${falhas} anexo(s) não puderam ser salvos.`);
      }
      
    } catch (anexoError) {
      console.error("Erro ao processar anexos:", anexoError);
      // Mesmo se falhar nos anexos, a tarefa já foi criada, então retornamos o ID
      toast.warning("Tarefa criada, mas houve um problema ao salvar os anexos");
    }
    
    return tarefaId;
  } catch (error) {
    console.error("Erro ao adicionar tarefa:", error);
    toast.error("Erro ao adicionar nova tarefa");
    return null;
  }
};

/**
 * Atualiza uma tarefa existente no banco de dados
 * @param id ID da tarefa a ser atualizada
 * @param tarefaAtualizada Dados da tarefa a serem atualizados
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const atualizarTarefa = async (
  id: string,
  tarefaAtualizada: Partial<Tarefa>,
  userId: string
): Promise<boolean> => {
  try {
    console.log("Iniciando atualização da tarefa:", id, {
      anexos: tarefaAtualizada.anexos?.length || 0
    });
    
    // Verificar anexos antes de prosseguir
    if (tarefaAtualizada.anexos && tarefaAtualizada.anexos.length > 0) {
      console.log(`Verificando ${tarefaAtualizada.anexos.length} anexos antes de atualizar a tarefa`);
      
      // Verificar apenas novos anexos (sem ID)
      const novosAnexos = tarefaAtualizada.anexos.filter(a => !a.id);
      
      // Validar todos os novos anexos
      for (const anexo of novosAnexos) {
        const resultado = validarAnexo(anexo);
        if (!resultado.valido) {
          console.error(`Validação falhou para anexo ${anexo.nome}: ${resultado.mensagem}`);
          toast.error(resultado.mensagem);
          return false;
        }
      }
    }
    
    // Construir objeto com os dados atualizados (sem anexos primeiro)
    const dadosAtualizados: any = {};
    
    if (tarefaAtualizada.titulo !== undefined) dadosAtualizados.titulo = tarefaAtualizada.titulo;
    if (tarefaAtualizada.descricao !== undefined) dadosAtualizados.descricao = tarefaAtualizada.descricao;
    if (tarefaAtualizada.data !== undefined) dadosAtualizados.data = tarefaAtualizada.data;
    if (tarefaAtualizada.hora !== undefined) dadosAtualizados.hora = tarefaAtualizada.hora;
    if (tarefaAtualizada.categoria?.id !== undefined) dadosAtualizados.categoria_id = tarefaAtualizada.categoria.id;
    if (tarefaAtualizada.prioridade !== undefined) dadosAtualizados.prioridade = tarefaAtualizada.prioridade;
    if (tarefaAtualizada.concluida !== undefined) dadosAtualizados.concluida = tarefaAtualizada.concluida;
    if (tarefaAtualizada.notificar !== undefined) dadosAtualizados.notificar = tarefaAtualizada.notificar;
    
    // Primeiro atualizar os dados principais da tarefa (sem os anexos)
    console.log("Atualizando dados básicos da tarefa primeiro");
    const { error } = await supabase
      .from('tarefas')
      .update(dadosAtualizados)
      .match({ id, user_id: userId });
    
    if (error) {
      console.error("Erro ao atualizar tarefa:", error);
      throw error;
    }
    
    // Se não há anexos para atualizar, retornar sucesso
    if (!tarefaAtualizada.anexos) {
      console.log("Não há anexos para atualizar");
      return true;
    }
    
    console.log(`Processando ${tarefaAtualizada.anexos.length} anexos para tarefa ${id}`);
    
    // Processar anexos separadamente da atualização principal
    try {
      // Primeiro, obter anexos atuais da tarefa para identificar quais devem ser removidos
      const { data: anexosAtuais, error: errorAnexosAtuais } = await supabase
        .from('tarefa_anexos')
        .select('anexo_id')
        .eq('tarefa_id', id);
      
      if (errorAnexosAtuais) {
        console.error("Erro ao buscar anexos atuais da tarefa:", errorAnexosAtuais);
        throw errorAnexosAtuais;
      }
      
      const idsAnexosAtuais = anexosAtuais?.map(a => a.anexo_id) || [];
      
      // Identificar anexos a serem mantidos (possuem ID)
      const idsAnexosManter = tarefaAtualizada.anexos
        .filter(a => a.id)
        .map(a => a.id);
      
      // Identificar anexos a serem removidos (estão em idsAnexosAtuais mas não em idsAnexosManter)
      const idsAnexosRemover = idsAnexosAtuais.filter(id => !idsAnexosManter.includes(id));
      
      // Remover anexos que não estão mais associados
      if (idsAnexosRemover.length > 0) {
        console.log(`Removendo ${idsAnexosRemover.length} anexos desassociados da tarefa ${id}`);
        
        for (const anexoId of idsAnexosRemover) {
          await removerAnexo(anexoId, id, userId);
        }
      }
      
      // Adicionar novos anexos (que não têm ID)
      const novosAnexos = tarefaAtualizada.anexos.filter(a => !a.id);
      
      if (novosAnexos.length > 0) {
        console.log(`Adicionando ${novosAnexos.length} novos anexos à tarefa ${id}`);
        
        // Processar novos anexos em paralelo
        const resultadosAnexos = await Promise.allSettled(
          novosAnexos.map(anexo => salvarAnexo(anexo, id, userId))
        );
        
        // Verificar resultados e mostrar mensagens apropriadas
        const sucessos = resultadosAnexos.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const falhas = resultadosAnexos.filter(r => r.status === 'rejected' || !(r.status === 'fulfilled' && (r.value as any).success)).length;
        
        if (sucessos === 0 && falhas > 0) {
          toast.error(`Tarefa atualizada, mas houve problemas ao salvar ${falhas} anexo(s).`);
        } else if (sucessos > 0 && falhas > 0) {
          toast.warning(`Tarefa atualizada com ${sucessos} anexo(s), mas ${falhas} anexo(s) não puderam ser salvos.`);
        }
      }
      
    } catch (anexoError) {
      console.error("Erro ao processar anexos:", anexoError);
      // Mesmo com erro nos anexos, a tarefa básica foi atualizada
      toast.warning("Tarefa atualizada, mas houve um problema ao processar os anexos");
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    toast.error("Erro ao atualizar tarefa");
    return false;
  }
};

/**
 * Remove uma tarefa do banco de dados
 * @param id ID da tarefa a ser removida
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const removerTarefa = async (id: string, userId: string): Promise<boolean> => {
  try {
    // Primeiro, remover os anexos relacionados
    const { error: anexosError } = await supabase
      .from('tarefa_anexos')
      .delete()
      .eq('tarefa_id', id);
    
    if (anexosError) throw anexosError;
    
    // Remover a tarefa
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erro ao remover tarefa:", error);
    toast.error("Erro ao remover tarefa");
    return false;
  }
};

/**
 * Marca uma tarefa como concluída ou não concluída
 * @param id ID da tarefa
 * @param concluida Status de conclusão (true/false)
 * @param userId ID do usuário logado
 * @returns true em caso de sucesso, false em caso de erro
 */
export const marcarConcluida = async (
  id: string,
  concluida: boolean,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tarefas')
      .update({ concluida })
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erro ao atualizar status da tarefa:", error);
    toast.error("Erro ao atualizar status da tarefa");
    return false;
  }
}; 