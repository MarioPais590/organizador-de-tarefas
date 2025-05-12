
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sobre</CardTitle>
        <CardDescription>
          Informações sobre o aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">
            <strong>Versão:</strong> 1.0.0
          </p>
          <p className="text-sm">
            <strong>Desenvolvedor:</strong> Mario Augusto
          </p>
          <p className="text-sm text-muted-foreground">
            Desenvolvido com React, Tailwind CSS e mais tecnologias modernas para
            criar uma experiência de usuário incrível.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
