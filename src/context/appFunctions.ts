import { Tarefa, Categoria, DadosPerfil, Rotina, ConfiguracoesNotificacao } from '@/types';
import { toast } from 'sonner';
import { CATEGORIAS_PADRAO } from './types';
import { supabase } from '@/integrations/supabase/client';
import { logout as authLogout, cleanupAuthState } from '@/services/authService';
import { solicitarPermissaoNotificacao, iniciarServicoNotificacoes, pararServicoNotificacoes } from '@/services/notificationService';

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
        dataCriacao: new Date(novaTarefaData.data_criacao)
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
      
      // Atualizar estado local
      const tarefaIndex = tarefas.findIndex(t => t.id === id);
      if (tarefaIndex !== -1) {
        const tarefasAtualizadas = [...tarefas];
        tarefasAtualizadas[tarefaIndex] = {
          ...tarefasAtualizadas[tarefaIndex],
          ...tarefaAtualizada
        };
        setTarefas(tarefasAtualizadas);
      }
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
      
      // Remover tarefa do Supabase
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

  // Função utilitária para comparação profunda
  const configsAreEqual = (config1: Partial<ConfiguracoesNotificacao>, config2: ConfiguracoesNotificacao): boolean => {
    // Verificar campo ativadas
    if (config1.ativadas !== undefined && config1.ativadas !== config2.ativadas) {
      return false;
    }
    
    // Verificar campo comSom
    if (config1.comSom !== undefined && config1.comSom !== config2.comSom) {
      return false;
    }
    
    // Verificar campos de antecedência
    if (config1.antecedencia) {
      if (config1.antecedencia.valor !== undefined && 
          config1.antecedencia.valor !== config2.antecedencia.valor) {
        return false;
      }
      
      if (config1.antecedencia.unidade !== undefined && 
          config1.antecedencia.unidade !== config2.antecedencia.unidade) {
        return false;
      }
    }
    
    // Se chegou até aqui, não há diferenças significativas
    return true;
  };

  // Funções para configurações de notificação
  const atualizarConfigNotificacoes = async (config: Partial<ConfiguracoesNotificacao>, showToast: boolean = true) => {
    try {
      if (!user) {
        toast.error("Você precisa estar logado para atualizar configurações");
        return false;
      }
      
      // Verificar se há mudanças reais para evitar atualizações desnecessárias
      if (configsAreEqual(config, configNotificacoes)) {
        console.log("Nenhuma mudança detectada nas configurações, ignorando atualização");
        return true;
      }
      
      // Log conciso das configurações
      console.log("Atualizando configurações de notificação:", JSON.stringify(config));
      
      // Verificar se notificações estão sendo ativadas
      if (config.ativadas === true && configNotificacoes.ativadas === false) {
        if (!("Notification" in window)) {
          toast.error("Seu navegador não suporta notificações");
          return false;
        }
        
        // Se precisamos de permissão e ainda não temos
        if (Notification.permission !== "granted") {
          try {
            const permissionGranted = await solicitarPermissaoNotificacao();
            if (!permissionGranted) {
              toast.error("Permissão para notificações negada. As notificações não funcionarão.");
              // Permitir continuar para salvar outras configurações
            }
          } catch (error) {
            console.error("Erro ao solicitar permissão:", error);
            toast.error("Ocorreu um erro ao solicitar permissão para notificações");
            return false;
          }
        }
      }
      
      // Estruturar dados para o banco
      const dadosParaAtualizar: any = {};
      
      if (config.ativadas !== undefined) {
        dadosParaAtualizar.ativadas = Boolean(config.ativadas);
      }
      
      if (config.comSom !== undefined) {
        dadosParaAtualizar.com_som = Boolean(config.comSom);
      }
      
      if (config.antecedencia) {
        if (config.antecedencia.valor !== undefined) {
          // Garantir que o valor seja um número inteiro válido
          let valor = parseInt(String(config.antecedencia.valor), 10);
          
          // Validar o valor
          if (isNaN(valor) || valor < 1) {
            valor = 30; // Valor padrão se inválido
            console.warn("Valor de antecedência inválido, utilizando 30 como padrão");
          }
          
          // Aplicar limites com base na unidade
          const unidade = config.antecedencia.unidade || configNotificacoes.antecedencia.unidade;
          const maxValor = unidade === 'minutos' ? 60 : 24;
          
          if (valor > maxValor) {
            valor = maxValor;
            console.warn(`Valor de antecedência excede o máximo para ${unidade}, limitando a ${maxValor}`);
          }
          
          dadosParaAtualizar.antecedencia_valor = valor;
        }
        
        if (config.antecedencia.unidade !== undefined) {
          // Validar que a unidade é um valor permitido
          const unidade = config.antecedencia.unidade === 'minutos' || config.antecedencia.unidade === 'horas' 
            ? config.antecedencia.unidade 
            : 'minutos';
            
          dadosParaAtualizar.antecedencia_unidade = unidade;
        }
      }
      
      if (Object.keys(dadosParaAtualizar).length === 0) {
        console.log("Nenhum dado para atualizar");
        return false;
      }
      
      // Verificar se já existe registro para esse usuário
      const { data: existente, error: erroConsulta } = await supabase
        .from('config_notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (erroConsulta && erroConsulta.code !== 'PGRST116') {
        console.error("Erro ao consultar configurações existentes:", erroConsulta);
        throw erroConsulta;
      }
      
      let dadosAtualizados;
      
      // Inserir ou atualizar registro
      if (existente) {
        const { data, error } = await supabase
          .from('config_notificacoes')
          .update(dadosParaAtualizar)
          .eq('user_id', user.id)
          .select();
        
        if (error) {
          console.error("Erro ao atualizar configuração:", error);
          throw error;
        }
        
        dadosAtualizados = data;
      } else {
        // Garantir que temos valores completos para criação de configuração
        if (!dadosParaAtualizar.ativadas) dadosParaAtualizar.ativadas = configNotificacoes.ativadas;
        if (dadosParaAtualizar.com_som === undefined) dadosParaAtualizar.com_som = configNotificacoes.comSom;
        if (!dadosParaAtualizar.antecedencia_valor) dadosParaAtualizar.antecedencia_valor = configNotificacoes.antecedencia.valor;
        if (!dadosParaAtualizar.antecedencia_unidade) dadosParaAtualizar.antecedencia_unidade = configNotificacoes.antecedencia.unidade;
        
        const { data, error } = await supabase
          .from('config_notificacoes')
          .insert({
            user_id: user.id,
            ...dadosParaAtualizar
          })
          .select();
        
        if (error) {
          console.error("Erro ao criar configuração:", error);
          throw error;
        }
        
        dadosAtualizados = data;
      }
      
      // Obter todas as configurações atualizadas do servidor para sincronizar o estado
      if (!dadosAtualizados || dadosAtualizados.length === 0) {
        const { data: configAtualizada, error: errorBusca } = await supabase
          .from('config_notificacoes')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (errorBusca) {
          console.error("Erro ao buscar configurações atualizadas:", errorBusca);
          throw errorBusca;
        }
        
        dadosAtualizados = [configAtualizada];
      }
      
      if (dadosAtualizados && dadosAtualizados.length > 0) {
        const configAtualizada = dadosAtualizados[0];
        
        const novasConfiguracoes = {
          ativadas: configAtualizada.ativadas,
          comSom: configAtualizada.com_som,
          antecedencia: {
            valor: configAtualizada.antecedencia_valor,
            unidade: configAtualizada.antecedencia_unidade as 'minutos' | 'horas'
          }
        };
        
        // Definir estado diretamente com os valores do servidor
        setConfigNotificacoes(novasConfiguracoes);
      } else {
        console.warn("Não foi possível obter configurações atualizadas do servidor");
      }
      
      // Se as notificações foram ativadas ou configurações alteradas, reiniciar o serviço
      if (config.ativadas === true || 
         (configNotificacoes.ativadas === true && (
           config.antecedencia?.valor !== undefined || 
           config.antecedencia?.unidade !== undefined ||
           config.comSom !== undefined
         ))) {
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
      
      return true; // Retornar true para indicar sucesso
    } catch (error) {
      console.error("Erro ao atualizar configurações de notificações:", error);
      if (showToast) {
        toast.error("Erro ao atualizar configurações de notificações. Por favor, tente novamente.");
      }
      return false; // Retornar false para indicar falha
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
      // 1. Remover tarefas
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
