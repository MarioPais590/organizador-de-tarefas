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
        description="Personalize o funcionamento do aplicativo" 
      />

      <div className="grid gap-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="database">Dados</TabsTrigger>
            <TabsTrigger value="pwa">PWA</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <GeneralSettings />
          </TabsContent>
          
          <TabsContent value="appearance" className="space-y-4">
            <AppearanceSettings />
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
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
          
          <TabsContent value="database" className="space-y-4">
            <DatabaseSettings />
          </TabsContent>
          
          <TabsContent value="pwa" className="space-y-4">
            <PWADiagnostics />
          </TabsContent>
        </Tabs>
        
        <DataPrivacySettings
          perfil={perfil}
          categorias={categorias}
          tarefas={tarefas}
          rotinas={rotinas}
          limparTodosDados={limparTodosDados}
        />
        
        <AboutSection />
      </div>
    </div>
  );
}
