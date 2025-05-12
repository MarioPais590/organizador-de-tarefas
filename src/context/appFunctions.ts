import { Tarefa, Categoria, DadosPerfil, Rotina, ConfiguracoesNotificacao, Anexo } from '@/types';
import { toast } from 'sonner';
import { CATEGORIAS_PADRAO } from './types';
import { solicitarPermissaoNotificacao, iniciarServicoNotificacoes, pararServicoNotificacoes } from '@/utils/notificacoes';
import { supabase } from '@/integrations/supabase/client';

export const createAppFunctions = (
  tarefas: Tarefa[],
  setTarefas: React.Dispatch<React.SetStateAction<Tarefa[]>>,
  categorias: Categoria[],
  setCategorias: React.Dispatch<React.SetStateAction<Categoria[]>>,
  rotinas: Rotina[],
  setRotinas: React.Dispatch<React.SetStateAction<Rotina[]>>,
  perfil: DadosPerfil,
  setPerfil: React.Dispatch<React.SetStateAction<DadosPerfil>>,
  configNotificacoes: ConfiguracoesNotificacao,
  setConfigNotificacoes: React.Dispatch<React.SetStateAction<ConfiguracoesNotificacao>>,
  verificarTarefasPendentes: () => void,
  user: any
) => {
  // Funções para tarefas
  const adicionarTarefa = async (tarefa: Omit<Tarefa, 'id'>) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para adicionar tarefas");
        return;
      }
      
      // Preparar os dados básicos da tarefa (sempre presentes em todos ambientes)
      const dadosTarefa: any = {
        user_id: user.id,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        data: tarefa.data,
        hora: tarefa.hora,
        categoria_id: tarefa.categoria.id,
        prioridade: tarefa.prioridade,
        concluida: tarefa.concluida
      };
      
      // Adicionar campo notificar apenas se ele existir na interface Tarefa
      // Isso torna o código compatível com ambientes que podem não ter a coluna ainda
      if (tarefa.notificar !== undefined) {
        dadosTarefa.notificar = tarefa.notificar !== undefined ? tarefa.notificar : true;
      }
      
      // Primeiro, inserir a tarefa no Supabase
      const { data: novaTarefaData, error: tarefaError } = await supabase
        .from('tarefas')
        .insert(dadosTarefa)
        .select()
        .single();
      
      if (tarefaError) throw tarefaError;
      
      // Criar e inserir anexos, se houver
      let anexos: Anexo[] = [];
      if (tarefa.anexos && tarefa.anexos.length > 0) {
        for (const anexo of tarefa.anexos) {
          // Inserir anexo
          const { data: novoAnexoData, error: anexoError } = await supabase
            .from('anexos')
            .insert({
              nome: anexo.nome,
              tipo: anexo.tipo,
              conteudo: anexo.conteudo,
              url: anexo.url
            })
            .select()
            .single();
          
          if (anexoError) throw anexoError;
          
          // Associar anexo à tarefa
          const { error: relacaoError } = await supabase
            .from('tarefa_anexos')
            .insert({
              tarefa_id: novaTarefaData.id,
              anexo_id: novoAnexoData.id
            });
          
          if (relacaoError) throw relacaoError;
          
          anexos.push({
            id: novoAnexoData.id,
            nome: novoAnexoData.nome,
            tipo: novoAnexoData.tipo,
            conteudo: novoAnexoData.conteudo,
            url: novoAnexoData.url
          });
        }
      }
      
      // Construir objeto completo da tarefa para o estado local
      const novaTarefa: Tarefa = {
        id: novaTarefaData.id,
        titulo: novaTarefaData.titulo,
        descricao: novaTarefaData.descricao,
        data: novaTarefaData.data,
        hora: novaTarefaData.hora,
        categoria: tarefa.categoria,
        prioridade: novaTarefaData.prioridade as 'baixa' | 'media' | 'alta',
        concluida: novaTarefaData.concluida,
        dataCriacao: new Date(novaTarefaData.data_criacao),
        anexos: anexos
      };
      
      // Atualizar estado local
      setTarefas([...tarefas, novaTarefa]);
      toast.success("Tarefa adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      toast.error("Erro ao adicionar tarefa. Por favor, tente novamente.");
    }
  };

  const atualizarTarefa = async (id: string, tarefaAtualizada: Partial<Tarefa>) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para atualizar tarefas");
        return;
      }
      
      // Dados para atualizar no Supabase
      const dadosAtualizar: any = {};
      
      if (tarefaAtualizada.titulo !== undefined) dadosAtualizar.titulo = tarefaAtualizada.titulo;
      if (tarefaAtualizada.descricao !== undefined) dadosAtualizar.descricao = tarefaAtualizada.descricao;
      if (tarefaAtualizada.data !== undefined) dadosAtualizar.data = tarefaAtualizada.data;
      if (tarefaAtualizada.hora !== undefined) dadosAtualizar.hora = tarefaAtualizada.hora;
      if (tarefaAtualizada.concluida !== undefined) dadosAtualizar.concluida = tarefaAtualizada.concluida;
      if (tarefaAtualizada.prioridade !== undefined) dadosAtualizar.prioridade = tarefaAtualizada.prioridade;
      if (tarefaAtualizada.categoria !== undefined) dadosAtualizar.categoria_id = tarefaAtualizada.categoria.id;
      
      // Tratar o campo notificar de maneira segura para diferentes ambientes
      try {
        if (tarefaAtualizada.notificar !== undefined) {
          dadosAtualizar.notificar = tarefaAtualizada.notificar;
        }
      } catch (notificarError) {
        console.warn("Campo notificar não suportado neste ambiente, ignorando", notificarError);
      }
      
      // Atualizar tarefa no Supabase
      const { error: tarefaError } = await supabase
        .from('tarefas')
        .update(dadosAtualizar)
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (tarefaError) throw tarefaError;
      
      // Lidar com anexos, se fornecido
      if (tarefaAtualizada.anexos !== undefined) {
        // Primeiro obtemos os anexos atuais
        const { data: anexosAtuais, error: anexosError } = await supabase
          .from('tarefa_anexos')
          .select(`
            anexo_id,
            anexos(*)
          `)
          .eq('tarefa_id', id);
        
        if (anexosError) throw anexosError;
        
        // Identificar anexos a remover e anexos a adicionar
        const idsAnexosAtuais = anexosAtuais?.map(a => a.anexo_id) || [];
        const idsAnexosNovos = tarefaAtualizada.anexos.map(a => a.id);
        
        // Remover anexos que não existem mais
        for (const anexoAtualId of idsAnexosAtuais) {
          if (!idsAnexosNovos.includes(anexoAtualId)) {
            // Remover relação
            await supabase
              .from('tarefa_anexos')
              .delete()
              .eq('tarefa_id', id)
              .eq('anexo_id', anexoAtualId);
            
            // Remover anexo
            await supabase
              .from('anexos')
              .delete()
              .eq('id', anexoAtualId);
          }
        }
        
        // Adicionar novos anexos
        for (const anexo of tarefaAtualizada.anexos) {
          if (!idsAnexosAtuais.includes(anexo.id)) {
            // Inserir anexo
            const { data: novoAnexoData, error: anexoError } = await supabase
              .from('anexos')
              .insert({
                nome: anexo.nome,
                tipo: anexo.tipo,
                conteudo: anexo.conteudo,
                url: anexo.url
              })
              .select()
              .single();
            
            if (anexoError) throw anexoError;
            
            // Associar anexo à tarefa
            const { error: relacaoError } = await supabase
              .from('tarefa_anexos')
              .insert({
                tarefa_id: id,
                anexo_id: novoAnexoData.id
              });
            
            if (relacaoError) throw relacaoError;
            
            // Atualizar o ID do anexo no objeto local
            anexo.id = novoAnexoData.id;
          } else {
            // Atualizar anexo existente
            await supabase
              .from('anexos')
              .update({
                nome: anexo.nome,
                tipo: anexo.tipo,
                conteudo: anexo.conteudo,
                url: anexo.url
              })
              .eq('id', anexo.id);
          }
        }
      }
      
      // Atualizar estado local
      setTarefas(
        tarefas.map((t) => (t.id === id ? { ...t, ...tarefaAtualizada } : t))
      );
      
      toast.success("Tarefa atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      toast.error("Erro ao atualizar tarefa. Por favor, tente novamente.");
    }
  };

  const removerTarefa = async (id: string) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para remover tarefas");
        return;
      }
      
      // Remover tarefa do Supabase (as relações e anexos são removidos automaticamente pelas restrições FK)
      const { error } = await supabase
        .from('tarefas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Atualizar estado local
      setTarefas(tarefas.filter((t) => t.id !== id));
      toast.success("Tarefa removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover tarefa:", error);
      toast.error("Erro ao remover tarefa. Por favor, tente novamente.");
    }
  };

  const marcarConcluida = async (id: string, concluida: boolean) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para atualizar tarefas");
        return;
      }
      
      // Atualizar status no Supabase
      const { error } = await supabase
        .from('tarefas')
        .update({ concluida })
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Atualizar estado local
      setTarefas(
        tarefas.map((t) => (t.id === id ? { ...t, concluida } : t))
      );
      
      toast.success(concluida ? "Tarefa concluída!" : "Tarefa reaberta!");
    } catch (error) {
      console.error("Erro ao atualizar status da tarefa:", error);
      toast.error("Erro ao atualizar status da tarefa. Por favor, tente novamente.");
    }
  };

  // Funções para categorias
  const adicionarCategoria = async (categoria: Omit<Categoria, 'id'>) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para adicionar categorias");
        return;
      }
      
      // Inserir categoria no Supabase
      const { data, error } = await supabase
        .from('categorias')
        .insert({
          nome: categoria.nome,
          cor: categoria.cor,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Adicionar ao estado local
      const novaCategoria = {
        id: data.id,
        nome: data.nome,
        cor: data.cor
      };
      
      setCategorias([...categorias, novaCategoria]);
      toast.success("Categoria adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar categoria:", error);
      toast.error("Erro ao adicionar categoria. Por favor, tente novamente.");
    }
  };

  const atualizarCategoria = async (id: string, categoria: Partial<Categoria>) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para atualizar categorias");
        return;
      }
      
      // Dados para atualizar
      const dadosAtualizar: any = {};
      if (categoria.nome !== undefined) dadosAtualizar.nome = categoria.nome;
      if (categoria.cor !== undefined) dadosAtualizar.cor = categoria.cor;
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('categorias')
        .update(dadosAtualizar)
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Atualizar estado local
      setCategorias(
        categorias.map((c) => (c.id === id ? { ...c, ...categoria } : c))
      );
      
      // Também atualizar as categorias nas tarefas
      setTarefas(
        tarefas.map((t) => {
          if (t.categoria.id === id) {
            return {
              ...t,
              categoria: {
                ...t.categoria,
                ...categoria
              }
            };
          }
          return t;
        })
      );
      
      toast.success("Categoria atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
      toast.error("Erro ao atualizar categoria. Por favor, tente novamente.");
    }
  };

  const removerCategoria = async (id: string) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para remover categorias");
        return;
      }
      
      // Verificar se existem tarefas com esta categoria
      const temTarefas = tarefas.some((t) => t.categoria.id === id);
      
      if (temTarefas) {
        toast.error("Não é possível remover uma categoria que possui tarefas!");
        return;
      }
      
      // Remover do Supabase
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Atualizar estado local
      setCategorias(categorias.filter((c) => c.id !== id));
      toast.success("Categoria removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover categoria:", error);
      toast.error("Erro ao remover categoria. Por favor, tente novamente.");
    }
  };

  // Funções para perfil
  const atualizarPerfil = async (dados: Partial<DadosPerfil>) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para atualizar seu perfil");
        return;
      }
      
      // Mapear dados para o formato do banco
      const dadosAtualizar: any = {};
      if (dados.nome !== undefined) dadosAtualizar.nome = dados.nome;
      if (dados.nomeApp !== undefined) dadosAtualizar.nome_app = dados.nomeApp;
      if (dados.avatar !== undefined) dadosAtualizar.avatar = dados.avatar;
      if (dados.logo !== undefined) dadosAtualizar.logo = dados.logo;
      if (dados.subtitulo !== undefined) dadosAtualizar.subtitulo = dados.subtitulo;
      if (dados.corTitulo !== undefined) dadosAtualizar.cor_titulo = dados.corTitulo;
      if (dados.corSubtitulo !== undefined) dadosAtualizar.cor_subtitulo = dados.corSubtitulo;
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('profiles')
        .update(dadosAtualizar)
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Atualizar estado local
      setPerfil({ ...perfil, ...dados });
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil. Por favor, tente novamente.");
    }
  };

  // Funções para rotinas
  const adicionarRotina = async (rotina: Omit<Rotina, 'id'>) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para adicionar rotinas");
        return;
      }
      
      // Inserir no Supabase
      const { data, error } = await supabase
        .from('rotinas')
        .insert({
          user_id: user.id,
          titulo: rotina.titulo,
          descricao: rotina.descricao,
          tipo: rotina.tipo,
          dias: rotina.dias,
          dias_do_mes: rotina.diasDoMes,
          horario: rotina.horario
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Construir objeto para o estado local
      const novaRotina: Rotina = {
        id: data.id,
        titulo: data.titulo,
        descricao: data.descricao,
        tipo: data.tipo as 'diaria' | 'semanal' | 'mensal',
        dias: data.dias ? 
          (Array.isArray(data.dias) ? 
            data.dias.map((d: any) => Number(d)) : 
            typeof data.dias === 'object' && data.dias !== null ? 
              Object.values(data.dias).map((d: any) => Number(d)) : 
              null) : null,
        diasDoMes: data.dias_do_mes ? 
          (Array.isArray(data.dias_do_mes) ? 
            data.dias_do_mes.map((d: any) => Number(d)) : 
            typeof data.dias_do_mes === 'object' && data.dias_do_mes !== null ? 
              Object.values(data.dias_do_mes).map((d: any) => Number(d)) : 
              null) : null,
        horario: data.horario
      };
      
      setRotinas([...rotinas, novaRotina]);
      toast.success("Rotina adicionada com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar rotina:", error);
      toast.error("Erro ao adicionar rotina. Por favor, tente novamente.");
    }
  };

  const atualizarRotina = async (id: string, rotina: Partial<Rotina>) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para atualizar rotinas");
        return;
      }
      
      // Mapear dados para o formato do banco
      const dadosAtualizar: any = {};
      if (rotina.titulo !== undefined) dadosAtualizar.titulo = rotina.titulo;
      if (rotina.descricao !== undefined) dadosAtualizar.descricao = rotina.descricao;
      if (rotina.tipo !== undefined) dadosAtualizar.tipo = rotina.tipo;
      if (rotina.dias !== undefined) dadosAtualizar.dias = rotina.dias;
      if (rotina.diasDoMes !== undefined) dadosAtualizar.diasDoMes = rotina.diasDoMes;
      if (rotina.horario !== undefined) dadosAtualizar.horario = rotina.horario;
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('rotinas')
        .update(dadosAtualizar)
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Atualizar estado local
      setRotinas(
        rotinas.map((r) => (r.id === id ? { ...r, ...rotina } : r))
      );
      
      toast.success("Rotina atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar rotina:", error);
      toast.error("Erro ao atualizar rotina. Por favor, tente novamente.");
    }
  };

  const removerRotina = async (id: string) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para remover rotinas");
        return;
      }
      
      // Remover do Supabase
      const { error } = await supabase
        .from('rotinas')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Atualizar estado local
      setRotinas(rotinas.filter(r => r.id !== id));
      
      toast.success("Rotina removida com sucesso!");
    } catch (error) {
      console.error("Erro ao remover rotina:", error);
      toast.error("Erro ao remover rotina. Por favor, tente novamente.");
    }
  };

  // Funções para configurações de notificação
  const atualizarConfigNotificacoes = async (config: Partial<ConfiguracoesNotificacao>, showToast: boolean = true) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para atualizar configurações");
        return;
      }
      
      // Verificar se notificações estão sendo ativadas
      if (config.ativadas === true && configNotificacoes.ativadas === false) {
        if (!("Notification" in window)) {
          toast.error("Seu navegador não suporta notificações");
          return;
        }
        
        // Se precisamos de permissão e ainda não temos
        if (Notification.permission !== "granted") {
          try {
            const permission = await solicitarPermissaoNotificacao();
            if (permission !== "granted") {
              toast.error("Permissão para notificações negada. As notificações não funcionarão.");
              // Permitir continuar para salvar outras configurações
            }
          } catch (error) {
            console.error("Erro ao solicitar permissão:", error);
            toast.error("Ocorreu um erro ao solicitar permissão para notificações");
            return;
          }
        }
      }
      
      // Estruturar dados para o banco
      const dadosParaAtualizar: any = {};
      
      if (config.ativadas !== undefined) {
        dadosParaAtualizar.ativadas = config.ativadas;
      }
      
      if (config.comSom !== undefined) {
        dadosParaAtualizar.com_som = config.comSom;
      }
      
      if (config.antecedencia) {
        if (config.antecedencia.valor !== undefined) {
          dadosParaAtualizar.antecedencia_valor = config.antecedencia.valor;
        }
        
        if (config.antecedencia.unidade !== undefined) {
          dadosParaAtualizar.antecedencia_unidade = config.antecedencia.unidade;
        }
      }
      
      // Verificar se já existe registro para esse usuário
      const { data: existente, error: erroConsulta } = await supabase
        .from('config_notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (erroConsulta && erroConsulta.code !== 'PGRST116') {
        throw erroConsulta;
      }
      
      // Inserir ou atualizar registro
      if (existente) {
        const { error } = await supabase
          .from('config_notificacoes')
          .update(dadosParaAtualizar)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('config_notificacoes')
          .insert({
            user_id: user.id,
            ...dadosParaAtualizar
          });
        
        if (error) throw error;
      }
      
      // Atualizar estado local
      setConfigNotificacoes(prev => {
        const updatedConfig = { ...prev };
        
        if (config.ativadas !== undefined) updatedConfig.ativadas = config.ativadas;
        if (config.comSom !== undefined) updatedConfig.comSom = config.comSom;
        
        if (config.antecedencia) {
          updatedConfig.antecedencia = { ...updatedConfig.antecedencia };
          
          if (config.antecedencia.valor !== undefined) {
            updatedConfig.antecedencia.valor = config.antecedencia.valor;
          }
          
          if (config.antecedencia.unidade !== undefined) {
            updatedConfig.antecedencia.unidade = config.antecedencia.unidade;
          }
        }
        
        return updatedConfig;
      });
      
      // Se as notificações foram ativadas ou configurações alteradas, reiniciar o serviço
      if (config.ativadas === true || 
         (configNotificacoes.ativadas === true && (
           config.antecedencia?.valor !== undefined || 
           config.antecedencia?.unidade !== undefined ||
           config.comSom !== undefined
         ))) {
        console.log("Reiniciando serviço de notificações devido a alterações nas configurações");
        if (Notification.permission === "granted") {
          // Parar qualquer serviço anterior
          pararServicoNotificacoes();
          // Iniciar o serviço com novas configurações
          iniciarServicoNotificacoes(verificarTarefasPendentes);
        }
      } else if (config.ativadas === false) {
        // Se as notificações foram desativadas, parar o serviço
        console.log("Notificações desativadas. Parando serviço.");
        pararServicoNotificacoes();
      }
      
      // Mostrar toast apenas quando solicitado explicitamente
      if (showToast) {
        toast.success("Configurações de notificações atualizadas!");
      }
    } catch (error) {
      console.error("Erro ao atualizar configurações de notificações:", error);
      if (showToast) {
        toast.error("Erro ao atualizar configurações de notificações. Por favor, tente novamente.");
      }
    }
  };

  // Função para limpar todos os dados
  const limparTodosDados = async () => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para limpar seus dados");
        return;
      }
      
      // Parar serviço de notificações
      pararServicoNotificacoes();
      
      // Remover dados do Supabase
      // 1. Remover tarefas (os anexos serão removidos automaticamente pelas restrições FK)
      await supabase
        .from('tarefas')
        .delete()
        .eq('user_id', user.id);
      
      // 2. Remover rotinas
      await supabase
        .from('rotinas')
        .delete()
        .eq('user_id', user.id);
      
      // 3. Remover categorias personalizadas, mas manter as padrão
      for (const categoria of categorias) {
        const isPadrao = CATEGORIAS_PADRAO.some(c => c.nome === categoria.nome && c.cor === categoria.cor);
        if (!isPadrao) {
          await supabase
            .from('categorias')
            .delete()
            .eq('id', categoria.id)
            .eq('user_id', user.id);
        }
      }
      
      // 4. Inserir categorias padrão
      await Promise.all(CATEGORIAS_PADRAO.map(async (categoria) => {
        await supabase
          .from('categorias')
          .insert({
            nome: categoria.nome,
            cor: categoria.cor,
            user_id: user.id
          });
      }));
      
      // 5. Resetar perfil
      await supabase
        .from('profiles')
        .update({
          nome: 'Usuário',
          nome_app: 'Organizador de Tarefas',
          subtitulo: 'Organize seu tempo e aumente sua produtividade',
          cor_titulo: '#3a86ff',
          cor_subtitulo: '#64748b',
          avatar: null,
          logo: null
        })
        .eq('id', user.id);
      
      // 6. Resetar configurações de notificações
      await supabase
        .from('config_notificacoes')
        .upsert({
          user_id: user.id,
          ativadas: true,
          com_som: false,
          antecedencia_valor: 30,
          antecedencia_unidade: 'minutos'
        });
      
      // Limpar estados locais
      setTarefas([]);
      setCategorias(CATEGORIAS_PADRAO);
      setRotinas([]);
      setPerfil({ 
        nome: 'Usuário', 
        nomeApp: 'Organizador de Tarefas',
        subtitulo: 'Organize seu tempo e aumente sua produtividade',
        corTitulo: '#3a86ff',
        corSubtitulo: '#64748b'
      });
      setConfigNotificacoes({
        ativadas: true,
        comSom: false,
        antecedencia: {
          valor: 30,
          unidade: 'minutos'
        }
      });
      
      // Se as notificações estavam ativadas, reiniciar o serviço
      iniciarServicoNotificacoes(verificarTarefasPendentes);
      
      toast.success("Todos os dados foram limpos com sucesso!");
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      toast.error("Erro ao limpar dados. Por favor, tente novamente.");
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpar os dados locais
      setTarefas([]);
      setCategorias(CATEGORIAS_PADRAO);
      setRotinas([]);
      setPerfil({ 
        nome: 'Usuário', 
        nomeApp: 'Organizador de Tarefas',
        subtitulo: 'Organize seu tempo e aumente sua produtividade',
        corTitulo: '#3a86ff',
        corSubtitulo: '#64748b'
      });
      setConfigNotificacoes({
        ativadas: true,
        comSom: false,
        antecedencia: {
          valor: 30,
          unidade: 'minutos'
        }
      });
      
      return true;
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      throw error;
    }
  };

  return {
    adicionarTarefa,
    atualizarTarefa,
    removerTarefa,
    marcarConcluida,
    adicionarCategoria,
    atualizarCategoria,
    removerCategoria,
    atualizarPerfil,
    adicionarRotina,
    atualizarRotina,
    removerRotina,
    atualizarConfigNotificacoes,
    limparTodosDados,
    logout
  };
};
