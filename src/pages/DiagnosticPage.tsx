import React from 'react';
import { Layout } from '@/components/Layout';
import { PWADiagnostics } from '@/components/settings/PWADiagnostics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DiagnosticPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Diagnóstico do Aplicativo</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Status do PWA</CardTitle>
          </CardHeader>
          <CardContent>
            <PWADiagnostics />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default DiagnosticPage; 