
import React from "react";
import { FileImage, FileText, FileAudio, File, FileX } from "lucide-react";

interface IconeAnexoProps {
  tipo: string;
}

export const IconeAnexo = ({ tipo }: IconeAnexoProps) => {
  switch (tipo) {
    case 'png':
    case 'jpg':
      return <FileImage className="h-4 w-4" />;
    case 'pdf':
      return <File className="h-4 w-4" />;
    case 'txt':
      return <FileText className="h-4 w-4" />;
    case 'mp3':
      return <FileAudio className="h-4 w-4" />;
    default:
      return <FileX className="h-4 w-4" />;
  }
};
