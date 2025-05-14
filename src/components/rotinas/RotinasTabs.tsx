import { RepeatIcon, Clock, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rotina } from "@/types";
import { RotinasList } from "./RotinasList";

interface RotinasTabsProps {
  rotinas: Rotina[];
  activeTab: string;
  onTabChange: (value: string) => void;
  onOpenDialog: () => void;
  onEditRotina: (rotina: Rotina) => void;
  onRemoveRotina: (id: string) => void;
}

export const RotinasTabs = ({
  rotinas,
  activeTab,
  onTabChange,
  onOpenDialog,
  onEditRotina,
  onRemoveRotina
}: RotinasTabsProps) => {
  const rotinaDiaria = rotinas.filter(r => r.tipo === "diaria");
  const rotinasSemanal = rotinas.filter(r => r.tipo === "semanal");
  const rotinasMenual = rotinas.filter(r => r.tipo === "mensal");

  return (
    <Tabs 
      defaultValue="todas" 
      value={activeTab} 
      onValueChange={onTabChange}
      className="mb-8"
    >
      <div className="w-full max-w-full">
        <TabsList className="w-full grid grid-cols-4 gap-x-1">
          <TabsTrigger 
            value="todas" 
            className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-1.5"
          >
            <RepeatIcon className="h-3 w-3 sm:h-4 sm:w-4" /> 
            <span className="flex items-center">
              Todas 
              <span className="ml-1 text-xs">({rotinas.length})</span>
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="diarias" 
            className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-1.5"
          >
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" /> 
            <span className="flex items-center">
              Diárias
              <span className="ml-1 text-xs">({rotinaDiaria.length})</span>
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="semanais" 
            className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-1.5"
          >
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" /> 
            <span className="flex items-center">
              Semanais
              <span className="ml-1 text-xs">({rotinasSemanal.length})</span>
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="mensais" 
            className="flex items-center gap-1 text-xs sm:text-sm px-1 sm:px-3 py-1.5"
          >
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" /> 
            <span className="flex items-center">
              Mensais
              <span className="ml-1 text-xs">({rotinasMenual.length})</span>
            </span>
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="todas">
        <RotinasList 
          rotinas={rotinas} 
          tipo="todas"
          onOpenDialog={onOpenDialog} 
          onEditRotina={onEditRotina} 
          onRemoveRotina={onRemoveRotina} 
        />
      </TabsContent>
      
      <TabsContent value="diarias">
        <RotinasList 
          rotinas={rotinas} 
          tipo="diarias"
          onOpenDialog={onOpenDialog} 
          onEditRotina={onEditRotina} 
          onRemoveRotina={onRemoveRotina} 
        />
      </TabsContent>
      
      <TabsContent value="semanais">
        <RotinasList 
          rotinas={rotinas} 
          tipo="semanais"
          onOpenDialog={onOpenDialog} 
          onEditRotina={onEditRotina} 
          onRemoveRotina={onRemoveRotina} 
        />
      </TabsContent>
      
      <TabsContent value="mensais">
        <RotinasList 
          rotinas={rotinas} 
          tipo="mensais"
          onOpenDialog={onOpenDialog} 
          onEditRotina={onEditRotina} 
          onRemoveRotina={onRemoveRotina} 
        />
      </TabsContent>
    </Tabs>
  );
};
