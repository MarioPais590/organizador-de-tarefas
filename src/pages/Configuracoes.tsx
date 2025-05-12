
import { PageHeader } from "@/components/PageHeader";
import { useApp } from "@/context/AppContext";
import { AppearanceSettings, NotificationSettings, DataPrivacySettings, AboutSection } from "@/components/settings";

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
  
  return (
    <div className="animate-in">
      <PageHeader 
        title="Configurações" 
        description="Personalize o funcionamento do aplicativo" 
      />

      <div className="grid gap-6">
        <AppearanceSettings />
        
        <NotificationSettings 
          configNotificacoes={configNotificacoes}
          atualizarConfigNotificacoes={atualizarConfigNotificacoes}
        />
        
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
