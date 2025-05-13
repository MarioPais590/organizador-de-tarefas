import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { 
  AppearanceSettings, 
  NotificationSettings, 
  DataPrivacySettings, 
  AboutSection,
  GeneralSettings,
  DatabaseSettings,
  PWADiagnostics
} from "@/components/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DebugNotifications } from "@/components/settings/notifications/DebugNotifications";

export default function Configuracoes() {
  const { 
    configNotificacoes, 
    atualizarConfigNotificacoes, 
    tarefas,
    categorias,
    rotinas,
    perfil,
    limparTodosDados
  } = useApp();
  
  // Check if environment is development
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="animate-in">
      <PageHeader 
        title="Configurações" 
        description="Gerencie as configurações do aplicativo"
      />

      <Tabs defaultValue="geral" className="mt-6">
        <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="geral" className="h-9">
            Geral
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="h-9">
            Aparência
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="h-9">
            Notificações
          </TabsTrigger>
          <TabsTrigger value="privacidade" className="h-9">
            Privacidade
          </TabsTrigger>
          <TabsTrigger value="banco" className="h-9">
            Banco de Dados
          </TabsTrigger>
          <TabsTrigger value="aplicativo" className="h-9">
            Aplicativo
          </TabsTrigger>
          <TabsTrigger value="sobre" className="h-9">
            Sobre
          </TabsTrigger>
          </TabsList>
          
        <TabsContent value="geral" className="mt-0 border-0 p-0">
            <GeneralSettings />
          </TabsContent>
          
        <TabsContent value="aparencia" className="mt-0 border-0 p-0">
            <AppearanceSettings />
          </TabsContent>
          
        <TabsContent value="notificacoes" className="mt-0 border-0 p-0">
            <NotificationSettings 
              configNotificacoes={configNotificacoes} 
              atualizarConfigNotificacoes={atualizarConfigNotificacoes} 
            />
            {isDevelopment && (
              <DebugNotifications 
                tarefas={tarefas}
                configNotificacoes={configNotificacoes}
              />
            )}
          </TabsContent>
          
        <TabsContent value="privacidade" className="mt-0 border-0 p-0">
        <DataPrivacySettings
          perfil={perfil}
          categorias={categorias}
          tarefas={tarefas}
          rotinas={rotinas}
          limparTodosDados={limparTodosDados}
        />
        </TabsContent>
        
        <TabsContent value="banco" className="mt-0 border-0 p-0">
          <DatabaseSettings />
        </TabsContent>
        
        <TabsContent value="aplicativo" className="mt-0 border-0 p-0">
          <PWADiagnostics />
        </TabsContent>
        
        <TabsContent value="sobre" className="mt-0 border-0 p-0">
        <AboutSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
