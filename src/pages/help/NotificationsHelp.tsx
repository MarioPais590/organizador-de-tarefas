/**
 * Página de ajuda sobre notificações
 * Contém instruções e documentação sobre notificações push em segundo plano
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, AppleIcon, Chrome, Smartphone } from 'lucide-react';
import { SmartphoneIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BackgroundNotificationCheck } from '@/components/settings/notifications/BackgroundNotificationCheck';

export function NotificationsHelp() {
  // Detectar plataforma atual
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  
  useEffect(() => {
    // Detectar plataforma
    const userAgent = navigator.userAgent;
    
    if (/iPad|iPhone|iPod/.test(userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      setPlatform('ios');
    } else if (/Android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);
  
  return (
    <div className="container max-w-3xl mx-auto py-6 px-4">
      <div className="mb-6">
        <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold">Instruções para Notificações</h1>
        <p className="text-muted-foreground mt-1">
          Aprenda como configurar e otimizar as notificações em seu dispositivo
        </p>
      </div>
      
      <div className="grid gap-6">
        <BackgroundNotificationCheck />
        
        <Card>
          <CardHeader>
            <CardTitle>Guia por dispositivo</CardTitle>
            <CardDescription>
              Selecione seu dispositivo para instruções específicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={platform}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="ios" className="flex items-center gap-1">
                  <AppleIcon className="h-4 w-4" />
                  <span>iOS</span>
                </TabsTrigger>
                <TabsTrigger value="android" className="flex items-center gap-1">
                  <SmartphoneIcon className="h-4 w-4" />
                  <span>Android</span>
                </TabsTrigger>
                <TabsTrigger value="desktop" className="flex items-center gap-1">
                  <Chrome className="h-4 w-4" />
                  <span>Desktop</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="ios" className="space-y-4">
                <Alert>
                  <AlertTitle>Importante para iOS</AlertTitle>
                  <AlertDescription>
                    No iOS, para receber notificações em segundo plano de forma confiável, você deve instalar o aplicativo na sua tela inicial.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Como instalar na tela inicial</h3>
                  <ol className="space-y-4 ml-5 list-decimal">
                    <li>
                      <p><strong>Abra o Safari</strong> - Este aplicativo deve ser instalado através do Safari.</p>
                      <p className="text-sm text-muted-foreground">Outros navegadores como Chrome não suportam a instalação completa no iOS.</p>
                    </li>
                    <li>
                      <p><strong>Toque no botão de compartilhamento</strong> - O ícone de compartilhamento está na parte inferior da tela (um quadrado com uma seta para cima).</p>
                      <div className="mt-2 bg-muted/30 p-3 rounded-md flex justify-center">
                        <div className="border rounded-md px-3 py-1 shadow-sm flex items-center gap-1">
                          <span className="i-lucide-square-up" />
                          <span>Compartilhar</span>
                        </div>
                      </div>
                    </li>
                    <li>
                      <p><strong>Role para baixo e toque em "Adicionar à Tela de Início"</strong></p>
                    </li>
                    <li>
                      <p><strong>Confirme o nome do aplicativo</strong> e toque em "Adicionar" no canto superior direito.</p>
                    </li>
                  </ol>
                  
                  <h3 className="font-medium text-lg mt-6">Permissões de notificação</h3>
                  <p>
                    Após instalar o aplicativo, você precisa permitir notificações:
                  </p>
                  <ol className="space-y-2 ml-5 list-decimal">
                    <li>Abra o aplicativo instalado na tela inicial</li>
                    <li>Quando solicitado, permita as notificações</li>
                    <li>
                      <p>Se você negou permissão anteriormente, pode reativar em:</p>
                      <p className="text-sm ml-4">Configurações → Notificações → [Nome do App] → Permitir Notificações</p>
                    </li>
                  </ol>
                </div>
              </TabsContent>
              
              <TabsContent value="android" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Instalar como aplicativo</h3>
                  <p>
                    Para o melhor desempenho das notificações em dispositivos Android, recomendamos instalar como um aplicativo:
                  </p>
                  <ol className="space-y-2 ml-5 list-decimal">
                    <li>
                      <p><strong>Navegue no aplicativo por alguns segundos</strong></p>
                      <p className="text-sm text-muted-foreground">Você verá um banner "Adicionar à tela inicial" ou um ícone de instalação na barra de endereço</p>
                    </li>
                    <li>
                      <p><strong>Toque em "Instalar" ou "Adicionar à tela inicial"</strong></p>
                    </li>
                    <li>
                      <p><strong>Confirme a instalação</strong> e aguarde a conclusão</p>
                    </li>
                  </ol>
                  
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Instalar aplicativo
                    </Button>
                  </div>
                  
                  <h3 className="font-medium text-lg mt-6">Otimização de bateria</h3>
                  <p>
                    Em dispositivos Android, o sistema pode limitar aplicativos em segundo plano para economizar bateria. Para garantir notificações confiáveis:
                  </p>
                  <ol className="space-y-2 ml-5 list-decimal">
                    <li>
                      <p>Abra as <strong>Configurações</strong> do seu dispositivo</p>
                    </li>
                    <li>
                      <p>Acesse <strong>Aplicativos</strong> ou <strong>Gerenciador de aplicativos</strong></p>
                    </li>
                    <li>
                      <p>Encontre e toque em <strong>Organizador de Tarefas</strong></p>
                    </li>
                    <li>
                      <p>Selecione <strong>Bateria</strong> ou <strong>Otimização de bateria</strong></p>
                    </li>
                    <li>
                      <p>Escolha <strong>Não otimizar</strong> ou <strong>Permitir em segundo plano</strong></p>
                    </li>
                  </ol>
                </div>
              </TabsContent>
              
              <TabsContent value="desktop" className="space-y-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Permitir notificações no seu navegador</h3>
                  <p>
                    Para receber notificações no desktop, você precisa permitir notificações no seu navegador:
                  </p>
                  
                  <h4 className="font-medium">Google Chrome</h4>
                  <ol className="space-y-1 ml-5 list-decimal">
                    <li>Clique no ícone de cadeado na barra de endereço</li>
                    <li>Selecione "Permissões do site"</li>
                    <li>Em "Notificações", selecione "Permitir"</li>
                  </ol>
                  
                  <h4 className="font-medium mt-4">Mozilla Firefox</h4>
                  <ol className="space-y-1 ml-5 list-decimal">
                    <li>Clique no ícone (i) na barra de endereço</li>
                    <li>Clique em "Mais informações"</li>
                    <li>Em "Permissões", habilite "Enviar Notificações"</li>
                  </ol>
                  
                  <h4 className="font-medium mt-4">Microsoft Edge</h4>
                  <ol className="space-y-1 ml-5 list-decimal">
                    <li>Clique no ícone de cadeado na barra de endereço</li>
                    <li>Clique em "Permissões do site"</li>
                    <li>Em "Notificações", selecione "Permitir"</li>
                  </ol>
                  
                  <h3 className="font-medium text-lg mt-6">Manter o aplicativo ativo</h3>
                  <p>
                    Para o melhor funcionamento, considere:
                  </p>
                  <ul className="space-y-2 ml-5 list-disc">
                    <li>Instalar como aplicativo do desktop clicando no ícone de instalação na barra de endereço</li>
                    <li>Manter uma guia aberta com o aplicativo, mesmo minimizada</li>
                    <li>Permitir que o navegador inicie automaticamente com o sistema</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Solução de problemas comuns</CardTitle>
            <CardDescription>
              Resolva problemas frequentes com notificações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Não estou recebendo notificações</h3>
                <ul className="space-y-2 ml-5 list-disc mt-2">
                  <li>Verifique se as notificações estão ativadas nas configurações do aplicativo</li>
                  <li>Certifique-se que seu dispositivo não está em modo "Não perturbe"</li>
                  <li>Em dispositivos móveis, instale o aplicativo na tela inicial</li>
                  <li>Verifique as permissões de notificação no navegador ou sistema</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium">Notificações atrasadas</h3>
                <ul className="space-y-2 ml-5 list-disc mt-2">
                  <li>Dispositivos podem atrasar notificações para economizar bateria</li>
                  <li>Verifique sua conexão com a internet</li>
                  <li>Em Android, desative otimização de bateria para o aplicativo</li>
                  <li>Em iOS, mantenha o aplicativo instalado como PWA atualizado</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium">Problemas em iOS</h3>
                <ul className="space-y-2 ml-5 list-disc mt-2">
                  <li>O iOS tem limitações para PWAs; instale sempre via Safari</li>
                  <li>Atualize para iOS 16.4 ou superior para melhor suporte</li>
                  <li>Abra o aplicativo periodicamente para garantir sincronização</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NotificationsHelp; 