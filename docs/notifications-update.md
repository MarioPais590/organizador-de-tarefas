# Implementação de Notificações em Segundo Plano

Este documento detalha a implementação do suporte a notificações push em segundo plano para iOS e Android no Organizador de Tarefas.

## Visão Geral

As modificações permitem que o aplicativo envie notificações mesmo quando o aplicativo está fechado ou quando a tela do dispositivo está desligada. Isso foi implementado usando:

1. Service Workers melhorados
2. Background Sync API 
3. Estratégias específicas para iOS e Android
4. Push API

## Arquivos Principais Modificados/Criados

- `public/sw.js` - Service Worker atualizado com suporte a background sync e push
- `src/serviceWorkerRegistration.ts` - Registro e gestão do service worker
- `src/services/pushService.ts` - Novo serviço para gerenciar notificações push
- `src/components/settings/notifications/BackgroundNotificationCheck.tsx` - Componente UI para verificação de suporte
- `public/manifest.json` - Atualizado com configurações para FCM
- `public/ios-config.xml` - Configurações para habilitar background modes no iOS

## Configuração para iOS

Para garantir que as notificações funcionem em dispositivos iOS (como iPhone 14) mesmo quando o app está fechado:

1. Ativado o modo Background Modes com a opção Remote notifications
2. Implementadas técnicas para manter o service worker ativo
3. Adicionada detecção do ciclo de vida da aplicação
4. Integração com APNs (Apple Push Notification service)

### Recomendações para iOS

- Para melhor desempenho, o aplicativo deve ser instalado como PWA
- Implementar o arquivo `ios-config.xml` junto com a configuração Xcode

## Configuração para Android

Para dispositivos Android:

1. Corrigido o registro para FCM (Firebase Cloud Messaging)
2. Implementada a Background Sync API
3. Usado Periodic Sync para verificações regulares
4. Otimizadas as permissões

## Como Funciona

1. **Registro Inicial**
   - O Service Worker é registrado ao carregar a aplicação
   - Solicita permissão para notificações
   - Registra-se para eventos de sincronização em segundo plano

2. **Ciclo de Vida**
   - Quando o aplicativo vai para segundo plano, o evento `visibilitychange` é detectado
   - O Service Worker ativa o modo de verificação em segundo plano
   - Em iOS, são usadas estratégias adicionais para acordar o dispositivo periodicamente

3. **Verificação de Tarefas**
   - Mesmo em segundo plano, o aplicativo verifica tarefas pendentes periodicamente
   - Se uma tarefa requer notificação, ela é enviada mesmo com o app fechado

4. **Permissões e Configuração**
   - Uma nova interface permite ao usuário verificar compatibilidade 
   - Fornece instruções específicas por plataforma (iOS/Android)
   - Mostra o status atual das notificações em segundo plano

## Compatibilidade

- **iOS**: Funciona melhor quando instalado como PWA na tela inicial
- **Android**: Compatível com a maioria dos dispositivos Android modernos
- **PWA**: Funciona melhor quando instalado como aplicativo nativo

## Chaves VAPID e FCM

O aplicativo usa chaves VAPID para autenticação segura com os serviços de push:

```js
const VAPID_PUBLIC_KEY = 'BHxKNS5mPT68fhwWEXeqcV_wT4CU4FCKO4xDR6j-dw1qGdMtKQwGRb5c6W5-fj0uXHg8LzdXqoaBg26iMjaxKrk';
```

> Nota: Em ambiente de produção, você deve gerar suas próprias chaves VAPID usando o Firebase Console ou a ferramenta web-push.

## Próximos Passos

1. Implementar um servidor real para gerenciar inscrições push
2. Adicionar análise de entrega de notificações
3. Otimizar o período de sincronização para economizar bateria
4. Adicionar suporte a notificações agrupadas

## Testes

Para verificar se as notificações em segundo plano estão funcionando:

1. Configure o aplicativo e conceda permissões
2. Feche completamente o aplicativo
3. Crie uma tarefa com hora de vencimento próxima (2-3 minutos)
4. Verifique se a notificação aparece mesmo com o aplicativo fechado
5. Para iOS, teste também com a tela bloqueada

## Recursos e Referências

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [APNs Documentation](https://developer.apple.com/documentation/usernotifications) 