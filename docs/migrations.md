# Migrações do Banco de Dados

Este arquivo documenta todas as migrações necessárias para manter o banco de dados sincronizado entre todos os ambientes (desenvolvimento, lovable, produção).

## Migrações Necessárias

### Migração 001 - Adicionar coluna notificar na tabela tarefas

**Data:** 12/05/2025

**Descrição:** Adiciona uma coluna notificar na tabela tarefas para permitir controle de notificações por tarefa.

**Script SQL:**

```sql
-- Adicionar coluna notificar na tabela tarefas se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tarefas' AND column_name = 'notificar'
    ) THEN
        ALTER TABLE public.tarefas ADD COLUMN notificar BOOLEAN DEFAULT TRUE;
        
        -- Atualizar tarefas existentes para ter notificar=true
        UPDATE public.tarefas SET notificar = TRUE WHERE notificar IS NULL;
    END IF;
END $$;
```

**Status nos ambientes:**
- Desenvolvimento: ✅ Aplicado em 12/05/2025
- Lovable: ❌ Pendente 
- Produção: ❌ Pendente

## Instruções para aplicar migrações

1. Acesse o painel de administração do Supabase para o ambiente desejado
2. Navegue até a seção "SQL Editor"
3. Crie uma nova consulta e cole o script SQL da migração
4. Execute a consulta
5. Atualize este documento marcando o ambiente como ✅ Aplicado

## Próximos passos para sincronização

Para evitar problemas de sincronização no futuro, considere implementar:

1. Um sistema automatizado de migrações (como Prisma, TypeORM ou scripts personalizados)
2. Uma estratégia de CI/CD que aplique migrações automaticamente em cada ambiente
3. Testes automatizados que validem a compatibilidade do esquema após migrações 