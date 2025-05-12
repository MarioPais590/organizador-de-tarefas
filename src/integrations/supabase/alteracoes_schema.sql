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