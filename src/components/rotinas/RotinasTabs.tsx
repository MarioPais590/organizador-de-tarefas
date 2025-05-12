
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
      <TabsList>
        <TabsTrigger value="todas" className="flex items-center gap-2">
          <RepeatIcon className="h-4 w-4" /> 
          Todas ({rotinas.length})
        </TabsTrigger>
        <TabsTrigger value="diarias" className="flex items-center gap-2">
          <Clock className="h-4 w-4" /> 
          Diárias ({rotinaDiaria.length})
        </TabsTrigger>
        <TabsTrigger value="semanais" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" /> 
          Semanais ({rotinasSemanal.length})
        </TabsTrigger>
        <TabsTrigger value="mensais" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" /> 
          Mensais ({rotinasMenual.length})
        </TabsTrigger>
      </TabsList>
      
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
