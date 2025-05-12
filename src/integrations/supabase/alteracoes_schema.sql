-- Adicionar coluna notificar na tabela tarefas se ainda não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tarefas' AND column_name = 'notificar'
    ) THEN
        ALTER TABLE public.tarefas ADD COLUMN notificar BOOLEAN DEFAULT TRUE;
        
        -- Atualizar tarefas existentes para ter notificar=true
        UPDATE public.tarefas SET notificar = TRUE WHERE notificar IS NULL;
    ELSE
        RAISE NOTICE 'Coluna notificar já existe na tabela tarefas';
    END IF;
END $$; 

-- Verificar e ajustar configurações padrão da tabela config_notificacoes
DO $$
BEGIN
    -- Verificar se a tabela já existe
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'config_notificacoes'
    ) THEN
        -- Verificar se é necessário ajustar valores padrão nas colunas
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'config_notificacoes' AND column_name = 'antecedencia_valor' AND column_default = '30'
        ) THEN
            -- Atualizar colunas para ter os valores padrão corretos
            ALTER TABLE public.config_notificacoes 
            ALTER COLUMN antecedencia_valor SET DEFAULT 30,
            ALTER COLUMN antecedencia_unidade SET DEFAULT 'minutos',
            ALTER COLUMN ativadas SET DEFAULT true,
            ALTER COLUMN com_som SET DEFAULT false;
            
            RAISE NOTICE 'Valores padrão da tabela config_notificacoes atualizados';
        ELSE
            RAISE NOTICE 'Valores padrão da tabela config_notificacoes já estão configurados';
        END IF;
        
        -- Corrigir registros com valores NULL nas colunas obrigatórias
        UPDATE public.config_notificacoes 
        SET 
            antecedencia_valor = 30 WHERE antecedencia_valor IS NULL,
            antecedencia_unidade = 'minutos' WHERE antecedencia_unidade IS NULL OR antecedencia_unidade = '',
            ativadas = true WHERE ativadas IS NULL,
            com_som = false WHERE com_som IS NULL;
            
        RAISE NOTICE 'Registros com valores NULL na tabela config_notificacoes foram corrigidos';
    ELSE
        RAISE NOTICE 'Tabela config_notificacoes não existe';
    END IF;
END $$;

-- Criar função para normalizar os dados de config_notificacoes
CREATE OR REPLACE FUNCTION normalizar_config_notificacoes()
RETURNS TRIGGER AS $$
BEGIN
    -- Normalizar valor de antecedência
    IF NEW.antecedencia_valor IS NULL OR NEW.antecedencia_valor < 1 THEN
        NEW.antecedencia_valor := 30;
    END IF;
    
    -- Normalizar unidade de antecedência
    IF NEW.antecedencia_unidade IS NULL OR (NEW.antecedencia_unidade != 'minutos' AND NEW.antecedencia_unidade != 'horas') THEN
        NEW.antecedencia_unidade := 'minutos';
    END IF;
    
    -- Aplicar limites com base na unidade
    IF NEW.antecedencia_unidade = 'minutos' AND NEW.antecedencia_valor > 60 THEN
        NEW.antecedencia_valor := 60;
    ELSIF NEW.antecedencia_unidade = 'horas' AND NEW.antecedencia_valor > 24 THEN
        NEW.antecedencia_valor := 24;
    END IF;
    
    -- Garantir que ativadas tenha um valor booleano
    IF NEW.ativadas IS NULL THEN
        NEW.ativadas := TRUE;
    END IF;
    
    -- Garantir que com_som tenha um valor booleano
    IF NEW.com_som IS NULL THEN
        NEW.com_som := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para normalizar os dados antes de inserir ou atualizar
DO $$
BEGIN
    -- Verificar se o trigger já existe
    IF NOT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'trigger_normalizar_config_notificacoes'
    ) THEN
        -- Criar o trigger
        CREATE TRIGGER trigger_normalizar_config_notificacoes
        BEFORE INSERT OR UPDATE ON public.config_notificacoes
        FOR EACH ROW
        EXECUTE FUNCTION normalizar_config_notificacoes();
        
        RAISE NOTICE 'Trigger para normalizar dados de config_notificacoes criado';
    ELSE
        RAISE NOTICE 'Trigger para normalizar dados de config_notificacoes já existe';
    END IF;
END $$;