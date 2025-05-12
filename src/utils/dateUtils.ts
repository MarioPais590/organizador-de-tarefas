import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Formata uma string de data para exibição com ou sem hora
 */
export const formatarData = (dataString: string, horaString?: string) => {
  try {
    // Criar objeto de data a partir da string ISO
    const [ano, mes, dia] = dataString.split('-').map(Number);
    
    // Criar data sem ajuste de timezone
    const data = new Date(ano, mes - 1, dia);
    
    // Se horário for fornecido, inclui na formatação
    if (horaString) {
      const [horas, minutos] = horaString.split(':').map(Number);
      data.setHours(horas, minutos);
      return format(data, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } else {
      return format(data, "dd 'de' MMMM", { locale: ptBR });
    }
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return dataString;
  }
};

/**
 * Formata a data para o formato ISO 8601 (YYYY-MM-DD)
 * Evita ajustes de timezone
 */
export const formatarDataParaISO = (data: Date): string => {
  const year = data.getFullYear();
  const month = String(data.getMonth() + 1).padStart(2, '0');
  const day = String(data.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Cria uma data a partir de uma string de data no formato ISO 8601
 * Preserva a data exata sem ajustes de timezone
 */
export const criarDataDeIso = (dataString: string): Date => {
  const [year, month, day] = dataString.split('-').map(Number);
  // Criar data sem ajuste de timezone
  return new Date(year, month - 1, day);
};

/**
 * Combina uma data ISO e uma string de hora em um único objeto Date
 * Preserva a data e hora exatas sem ajustes de timezone
 */
export const combinarDataHora = (dataIso: string, hora: string): Date => {
  // Parse das partes da data
  const [year, month, day] = dataIso.split('-').map(Number);
  
  // Parse das partes da hora
  let horas = 0;
  let minutos = 0;
  
  if (hora && hora.includes(':')) {
    const timeParts = hora.split(':');
    horas = parseInt(timeParts[0], 10);
    minutos = parseInt(timeParts[1], 10);
  }
  
  // Criar data com componentes exatos
  return new Date(year, month - 1, day, horas, minutos, 0, 0);
};

/**
 * Extrai a hora de um objeto Date no formato HH:MM
 * Retorna a hora exata sem ajustes de timezone
 */
export const extrairHora = (data: Date): string => {
  const horas = data.getHours().toString().padStart(2, '0');
  const minutos = data.getMinutes().toString().padStart(2, '0');
  return `${horas}:${minutos}`;
};

/**
 * Converte formato de data ISO para exibição em formato local (DD/MM/YYYY)
 * Preserva a data exata sem ajustes de timezone
 */
export const formatarDataParaExibicao = (dataString: string): string => {
  try {
    const [year, month, day] = dataString.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  } catch (error) {
    console.error("Erro ao formatar data para exibição:", error);
    return dataString;
  }
};

/**
 * Formata um intervalo de tempo em milissegundos para exibição em formato amigável
 * @param milissegundos Tempo em milissegundos
 * @returns String formatada (ex: "5 minutos", "1 hora e 30 minutos")
 */
export const formatarTempo = (milissegundos: number): string => {
  // Converter para segundos
  const segundos = Math.floor(milissegundos / 1000);
  
  // Se for menos de um minuto
  if (segundos < 60) {
    return `${segundos} segundo${segundos !== 1 ? 's' : ''}`;
  }
  
  // Converter para minutos
  const minutos = Math.floor(segundos / 60);
  
  // Se for menos de uma hora
  if (minutos < 60) {
    return `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
  }
  
  // Converter para horas e minutos
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  
  // Se não tiver minutos restantes
  if (minutosRestantes === 0) {
    return `${horas} hora${horas !== 1 ? 's' : ''}`;
  }
  
  // Retornar formato horas e minutos
  return `${horas} hora${horas !== 1 ? 's' : ''} e ${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''}`;
};
