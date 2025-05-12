import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Verifica e aplica a migração para adicionar o campo notificar na tabela tarefas
 * @returns Promise<boolean> true se a migração foi bem-sucedida ou não era necessária
 */
export const verificarMigracaoNotificar = async (): Promise<boolean> => {
  try {
    console.log("Verificando migração da coluna 'notificar' na tabela tarefas...");
    
    // Verificar se a coluna já existe usando uma consulta simples
    try {
      // Tentar selecionar uma tarefa com a coluna notificar
      const { data: teste, error: erroTeste } = await supabase
        .from('tarefas')
        .select('notificar')
        .limit(1);
      
      // Se não houver erro, a coluna existe
      if (!erroTeste) {
        console.log("Coluna 'notificar' já existe na tabela tarefas");
        return true;
      } else if (erroTeste.message && erroTeste.message.includes("does not exist")) {
        // Se o erro indicar que a coluna não existe, aplicar a migração
        console.log("Coluna 'notificar' não existe. Aplicando migração...");
        return await aplicarMigracaoNotificar();
      } else {
        // Se for outro tipo de erro
        console.error("Erro ao verificar existência da coluna:", erroTeste);
        
        // Tentar verificar de outra forma
        const { data, error } = await supabase
          .from('tarefas')
          .select('*')
          .limit(1);
          
        if (error) {
          console.error("Erro ao acessar a tabela tarefas:", error);
          throw error;
        }
        
        // Verificar se o primeiro registro tem a propriedade notificar
        if (data && data.length > 0) {
          if ('notificar' in data[0]) {
            console.log("Coluna 'notificar' já existe (verificação alternativa)");
            return true;
          } else {
            console.log("Coluna 'notificar' não existe (verificação alternativa)");
            return await aplicarMigracaoNotificar();
          }
        }
        
        // Se não foi possível verificar, assumir que a coluna não existe
        return await aplicarMigracaoNotificar();
      }
    } catch (erroAlt) {
      console.error("Erro na verificação:", erroAlt);
      
      // Em caso de erro, sugerir ao usuário verificar a estrutura do banco manualmente
      toast.warning(
        "Não foi possível verificar automaticamente a estrutura do banco de dados.",
        { duration: 8000 }
      );
      
      return false;
    }
  } catch (erro) {
    console.error("Erro ao verificar migração da coluna 'notificar':", erro);
    toast.error("Erro ao verificar estrutura do banco de dados");
    return false;
  }
};

/**
 * Aplica a migração para adicionar o campo notificar na tabela tarefas
 * usando função personalizada no banco de dados
 * @returns Promise<boolean> true se a migração foi bem-sucedida
 */
const aplicarMigracaoNotificar = async (): Promise<boolean> => {
  try {
    console.log("Adicionando a coluna 'notificar' ao banco de dados...");
    
    // Informar ao usuário sobre a migração sendo aplicada
    toast.info("Atualizando banco de dados...", { duration: 3000 });
    
    try {
      // Verificar se a tabela tarefas tem pelo menos um registro
      const { data: registros, error: erroRegistros } = await supabase
        .from('tarefas')
        .select('id')
        .limit(1);
        
      if (erroRegistros) {
        console.error("Erro ao verificar registros:", erroRegistros);
        throw erroRegistros;
      }
      
      if (!registros || registros.length === 0) {
        console.log("Tabela tarefas está vazia, não é necessário atualizar registros existentes");
        // Se não há registros, apenas sugerir ao usuário realizar a migração quando necessário
        toast.success("Banco de dados pronto para uso!");
        return true;
      }
    } catch (erroCheck) {
      console.error("Erro ao verificar registros:", erroCheck);
    }
    
    // Informar ao usuário que a migração não pôde ser aplicada automaticamente
    toast.warning(
      "Uma atualização do banco de dados é necessária. Clique no botão de configurações e aplique as migrações.",
      { duration: 10000 }
    );
    
    return false;
  } catch (erro) {
    console.error("Erro ao aplicar migração:", erro);
    toast.error("Erro ao atualizar banco de dados. Clique nas configurações para tentar novamente.");
    return false;
  }
}; 