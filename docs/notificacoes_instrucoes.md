# Instruções para correção das notificações

Foi identificado um problema no sistema de notificações que impedia o funcionamento correto para tarefas com tempo de antecedência curto (como 2 minutos).

Para corrigir esse problema, foram realizadas as seguintes alterações:

1. Adicionado o campo `notificar` na interface Tarefa
2. Adicionado o campo `notificar` na tabela tarefas do banco de dados
3. Modificada a função verificarTarefasPendentes para verificar o campo notificar
4. Adicionado um controle mais preciso para tempos curtos de notificação
5. Adicionados logs detalhados para diagnóstico

## Para completar a correção

É necessário executar o script SQL no banco de dados Supabase para adicionar a coluna `notificar`. Siga os passos abaixo:

1. Acesse o painel de administração do Supabase
2. Navegue até a seção "SQL Editor"
3. Crie uma nova consulta e cole o seguinte código:

```sql
-- Adicionar coluna notificar na tabela tarefas
ALTER TABLE public.tarefas
ADD COLUMN notificar BOOLEAN DEFAULT TRUE;

-- Atualizar tarefas existentes para ter notificar=true
UPDATE public.tarefas
SET notificar = TRUE
WHERE notificar IS NULL;
```

4. Execute a consulta

Após executar esse script, as notificações funcionarão corretamente, incluindo para tarefas com tempos curtos de antecedência (2 minutos, por exemplo).

## Comportamento esperado

- Quando você cria uma nova tarefa, por padrão as notificações estão ativadas
- Você pode desativar as notificações para uma tarefa específica ao criar ou editar a tarefa
- O sistema verifica as tarefas pendentes a cada 30 segundos
- Para tarefas com tempo de antecedência curto, o sistema usa uma margem de tolerância para garantir que a notificação seja enviada 