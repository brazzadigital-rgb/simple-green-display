import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface ImportResult {
  name: string;
  status: string;
  error?: string;
}

export default function AdminImportProducts() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<{ imported: number; errors: number } | null>(null);

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResults(null);
    setSummary(null);

    try {
      const csvText = await file.text();

      const { data, error } = await supabase.functions.invoke("import-products", {
        body: { csv: csvText },
      });

      if (error) throw error;

      setResults(data.details || []);
      setSummary({ imported: data.imported, errors: data.errors });

      toast({
        title: `Importação concluída!`,
        description: `${data.imported} produtos importados, ${data.errors} erros.`,
      });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Produtos</h1>
        <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>
          Importe produtos a partir de um CSV exportado do Shopify
        </p>
      </div>

      <div className="admin-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Upload CSV</h2>
        </div>
        <div className="space-y-4">
          <div className="p-4 border-2 border-dashed border-border rounded-xl bg-muted/30">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="border-0 bg-transparent"
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                Arquivo: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
            <strong>⚠️ Atenção:</strong> Esta ação irá deletar todos os produtos existentes e
            substituí-los pelos produtos do CSV.
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="gap-2 rounded-xl shine"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Importar Produtos
              </>
            )}
          </Button>
        </div>
      </div>

      {summary && (
        <div className="admin-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold">Resultado</h2>
          </div>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-bold">{summary.imported}</span> importados
              </div>
              {summary.errors > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold">{summary.errors}</span> erros
                </div>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {results?.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-sm py-1 px-2 rounded ${
                    r.status === "ok" ? "text-foreground" : "text-destructive bg-destructive/10"
                  }`}
                >
                  {r.status === "ok" ? (
                    <CheckCircle className="w-3 h-3 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 shrink-0" />
                  )}
                  <span>{r.name}</span>
                  {r.error && <span className="text-xs ml-auto">{r.error}</span>}
                </div>
              ))}
            </div>
        </div>
      )}
    </div>
  );
}
