
import React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { Palette } from "lucide-react";

interface ColorPickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({
  id,
  label,
  value,
  onChange,
  className,
}: ColorPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <div 
          className="h-5 w-5 rounded-md border" 
          style={{ backgroundColor: value }} 
        />
      </div>
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Cor atual: {value}
      </div>
    </div>
  );
}
