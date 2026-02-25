import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, Filter, Upload, Download, Loader2, CheckCircle, AlertCircle, MoreVertical, Search } from "lucide-react";
import { useIsDemo } from "@/hooks/useIsDemo";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/exportCsv";
import { motion } from "framer-motion";

interface Supplier { id: string; trade_name: string; }

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  sku: string | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  sold_count: number;
  created_at: string;
  supplier_id: string | null;
}

export default function Products() {
  const { blockIfDemo } = useIsDemo();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [productThumbnails, setProductThumbnails] = useState<Record<string, string>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ imported: number; errors: number; details: Array<{ name: string; status: string; error?: string }> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s.trade_name]));

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, trade_name").eq("status", "active").order("trade_name");
    setSuppliers((data as Supplier[]) || []);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((data as Product[]) || []);
    const { data: imgs } = await supabase.from("product_images").select("product_id, url").eq("is_primary", true);
    const thumbs: Record<string, string> = {};
    imgs?.forEach((img: any) => { thumbs[img.product_id] = img.url; });
    setProductThumbnails(thumbs);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); fetchSuppliers(); }, []);

  const handleDelete = async (id: string) => {
    if (blockIfDemo()) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast({ title: "Erro ao deletar", description: error.message, variant: "destructive" });
    else { toast({ title: "Produto removido" }); fetchProducts(); }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResults(null);
    try {
      const csvText = await importFile.text();
      const { data, error } = await supabase.functions.invoke("import-products", { body: { csv: csvText } });
      if (error) throw error;
      setImportResults({ imported: data.imported, errors: data.errors, details: data.details || [] });
      toast({ title: "Importação concluída!", description: `${data.imported} produtos importados, ${data.errors} erros.` });
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data: allProducts } = await supabase.from("products").select("*").order("name");
      const { data: allImages } = await supabase.from("product_images").select("product_id, url, is_primary, sort_order");
      const { data: allVariants } = await supabase.from("product_variants").select("product_id, name, price, sku, stock, compare_at_price");

      if (!allProducts?.length) {
        toast({ title: "Nenhum produto para exportar", variant: "destructive" });
        return;
      }

      const imagesByProduct: Record<string, any[]> = {};
      allImages?.forEach((img: any) => {
        if (!imagesByProduct[img.product_id]) imagesByProduct[img.product_id] = [];
        imagesByProduct[img.product_id].push(img);
      });

      const variantsByProduct: Record<string, any[]> = {};
      allVariants?.forEach((v: any) => {
        if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = [];
        variantsByProduct[v.product_id].push(v);
      });

      const headers = ["Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published", "Variant SKU", "Variant Price", "Variant Compare At Price", "Variant Inventory Qty", "Image Src", "Image Position", "Status"];
      const rows: string[][] = [];

      allProducts.forEach((p: any) => {
        const images = (imagesByProduct[p.id] || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
        const variants = variantsByProduct[p.id] || [];
        const maxRows = Math.max(1, images.length, variants.length);

        for (let i = 0; i < maxRows; i++) {
          const row: string[] = [];
          if (i === 0) {
            row.push(p.slug, p.name, p.description || "", p.brand || "", p.product_type || "", (p.tags || []).join(", "), p.is_active ? "true" : "false");
          } else {
            row.push("", "", "", "", "", "", "");
          }
          const v = variants[i];
          row.push(v?.sku || p.sku || "", v?.price?.toString() || (i === 0 ? p.price?.toString() : ""), v?.compare_at_price?.toString() || (i === 0 ? p.compare_at_price?.toString() || "" : ""), v?.stock?.toString() || (i === 0 ? p.stock?.toString() : ""));
          const img = images[i];
          row.push(img?.url || "", img ? (i + 1).toString() : "", i === 0 ? (p.is_active ? "active" : "draft") : "");
          rows.push(row);
        }
      });

      const csvContent = [headers, ...rows].map(r => r.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `produtos_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exportação concluída!", description: `${allProducts.length} produtos exportados.` });
    } catch (err: any) {
      toast({ title: "Erro ao exportar", description: err.message, variant: "destructive" });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSupplier = filterSupplier === "all" || (filterSupplier === "none" ? !p.supplier_id : p.supplier_id === filterSupplier);
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSupplier && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">Produtos</h1>
          <p className="text-sm mt-1 text-slate-400">
            {filteredProducts.length} produto(s) no catálogo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl flex items-center gap-2 px-3 py-2.5 text-sm font-medium cursor-pointer shadow-sm transition-all">
                <MoreVertical className="w-4 h-4" /> Ações
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setImportOpen(true)} className="gap-2 cursor-pointer">
                <Upload className="w-4 h-4" /> Importar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="gap-2 cursor-pointer">
                <Download className="w-4 h-4" /> Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => navigate("/admin/produtos/novo")}
            className="admin-btn-primary"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="admin-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar produto..."
              className="admin-input pl-9"
            />
          </div>
          {suppliers.length > 0 && (
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="h-10 w-full sm:w-48 admin-input">
                <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="none">Sem fornecedor</SelectItem>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.trade_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="admin-card overflow-hidden"
      >
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="w-12 h-12 mb-4 text-slate-200" />
            <p className="text-base font-medium text-slate-600">Nenhum produto encontrado</p>
            <p className="text-sm mt-1 text-slate-400">Clique em "Novo Produto" para começar</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    <TableHead className="admin-table-th w-14">Foto</TableHead>
                    <TableHead className="admin-table-th">Nome</TableHead>
                    <TableHead className="admin-table-th">Preço</TableHead>
                    <TableHead className="admin-table-th text-right">Estoque</TableHead>
                    <TableHead className="admin-table-th">Status</TableHead>
                    <TableHead className="admin-table-th text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, i) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-50"
                      onClick={() => navigate(`/admin/produtos/${product.id}/editar`)}
                    >
                      <TableCell className="py-3">
                        {productThumbnails[product.id] ? (
                          <div className="product-thumb-mini w-20 h-20 border border-slate-100">
                            <img src={productThumbnails[product.id]} alt={product.name} />
                          </div>
                        ) : (
                          <div className="product-thumb-mini w-20 h-20 border border-slate-100">
                            <Package className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-medium text-slate-700">{product.name}</p>
                        <p className="text-[11px] text-slate-400">{product.sku || "—"}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-sm font-semibold text-slate-700">{formatBRL(Number(product.price))}</p>
                        {product.compare_at_price && (
                          <p className="text-[11px] line-through text-slate-400">{formatBRL(Number(product.compare_at_price))}</p>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className={`text-sm font-medium ${product.stock < 5 ? "text-red-500" : "text-slate-600"}`}>{product.stock}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className={`admin-status-pill ${product.is_active ? "admin-status-success" : "admin-status-danger"}`}>
                            {product.is_active ? "Ativo" : "Inativo"}
                          </span>
                          {product.is_featured && <span className="admin-status-pill admin-status-info">Destaque</span>}
                          {product.is_new && <span className="admin-status-pill admin-status-success">Novo</span>}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" onClick={() => navigate(`/admin/produtos/${product.id}/editar`)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => navigate(`/admin/produtos/${product.id}/editar`)}
                >
                  {productThumbnails[product.id] ? (
                    <div className="product-thumb-mini w-12 h-12 flex-shrink-0 border border-slate-100">
                      <img src={productThumbnails[product.id]} alt={product.name} />
                    </div>
                  ) : (
                    <div className="product-thumb-mini w-12 h-12 flex-shrink-0 border border-slate-100">
                      <Package className="w-5 h-5 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-slate-800">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-slate-700">{formatBRL(Number(product.price))}</span>
                      <span className="text-[11px] text-slate-400">· {product.stock} un.</span>
                    </div>
                  </div>
                  <span className={`admin-status-pill flex-shrink-0 ${product.is_active ? "admin-status-success" : "admin-status-danger"}`}>
                    {product.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-slate-800">Importar Produtos (CSV)</DialogTitle>
            <DialogDescription className="text-slate-400">
              Faça upload de um arquivo CSV (Shopify) para importar produtos em massa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">
                {importFile ? importFile.name : "Clique para selecionar o arquivo"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Suporta CSV padrão Shopify</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv" 
                onChange={(e) => setImportFile(e.target.files?.[0] || null)} 
              />
            </div>

            {importing && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <Loader2 className="w-4 h-4 animate-spin" /> Processando importação...
              </div>
            )}

            {importResults && (
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Resultado da Importação
                </div>
                <p className="text-slate-500">
                  <span className="font-bold text-emerald-600">{importResults.imported}</span> importados com sucesso.
                </p>
                {importResults.errors > 0 && (
                  <p className="text-slate-500">
                    <span className="font-bold text-red-500">{importResults.errors}</span> erros encontrados.
                  </p>
                )}
                {importResults.details.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1 border-t border-slate-200 pt-2">
                    {importResults.details.map((d, i) => (
                      <div key={i} className={`flex justify-between ${d.status === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                        <span className="truncate max-w-[200px]">{d.name}</span>
                        <span>{d.status === 'error' ? 'Erro' : 'OK'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setImportOpen(false)} className="rounded-xl border-slate-200">Cancelar</Button>
              <Button onClick={handleImport} disabled={!importFile || importing} className="admin-btn-primary">
                Importar Agora
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}