import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  ArrowLeft, Mail, Phone, MessageCircle, Copy, ShoppingBag, MapPin,
  Heart, StickyNote, Activity, Crown, Calendar, Edit3, Plus, Trash2, ShieldCheck, ShieldOff
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function AdminCustomerDetail() {
  const { id: userId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newNote, setNewNote] = useState("");

  // User roles
  const { data: customerRoles = [] } = useQuery({
    queryKey: ["admin-customer-roles", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      return (data || []).map((r: any) => r.role as string);
    },
    enabled: !!userId,
  });

  const customerIsAdmin = customerRoles.includes("admin");

  const toggleAdminMutation = useMutation({
    mutationFn: async () => {
      if (customerIsAdmin) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId!).eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId!, role: "admin" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customer-roles", userId] });
      qc.invalidateQueries({ queryKey: ["admin-customer-roles"] });
      toast({ title: customerIsAdmin ? "Permissão de admin removida" : "Usuário promovido a admin" });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-customer-detail", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Email from orders
  const { data: email } = useQuery({
    queryKey: ["admin-customer-email", userId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("customer_email").eq("user_id", userId!).not("customer_email", "is", null).limit(1);
      return data?.[0]?.customer_email || null;
    },
    enabled: !!userId,
  });

  // Orders
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-customer-orders", userId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // Addresses
  const { data: addresses = [] } = useQuery({
    queryKey: ["admin-customer-addresses", userId],
    queryFn: async () => {
      const { data } = await supabase.from("customer_addresses").select("*").eq("user_id", userId!).order("is_default", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  // Favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["admin-customer-favorites", userId],
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("*, products(name, price, slug)").eq("user_id", userId!);
      return data || [];
    },
    enabled: !!userId,
  });

  // Notes
  const { data: notes = [] } = useQuery({
    queryKey: ["admin-customer-notes", userId],
    queryFn: async () => {
      const { data } = await supabase.from("customer_notes").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!newNote.trim()) return;
      const { error } = await supabase.from("customer_notes").insert({
        user_id: userId!,
        content: newNote.trim(),
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customer-notes", userId] });
      setNewNote("");
      toast({ title: "Nota adicionada" });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("customer_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customer-notes", userId] });
      toast({ title: "Nota removida" });
    },
  });

  // Order events (activity)
  const { data: events = [] } = useQuery({
    queryKey: ["admin-customer-events", userId],
    queryFn: async () => {
      const orderIds = orders.map(o => o.id);
      if (orderIds.length === 0) return [];
      const { data } = await supabase.from("order_events").select("*").in("order_id", orderIds).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: orders.length > 0,
  });

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatPhone = (p: string | null) => {
    if (!p) return "—";
    const clean = p.replace(/\D/g, "");
    if (clean.length === 11) return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
    return p;
  };
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  };

  const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);
  const avgTicket = orders.length > 0 ? totalSpent / orders.length : 0;
  const isVip = orders.length >= 5 || totalSpent >= 1000;

  const whatsappUrl = (phone: string | null, name: string | null) => {
    if (!phone) return "#";
    const clean = phone.replace(/\D/g, "");
    const number = clean.startsWith("55") ? clean : `55${clean}`;
    const msg = encodeURIComponent(`Olá ${name || ""}! 😊 Posso te ajudar?`);
    return `https://wa.me/${number}?text=${msg}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "Pendente", cls: "bg-amber-100 text-amber-700" },
      confirmed: { label: "Confirmado", cls: "bg-blue-100 text-blue-700" },
      processing: { label: "Processando", cls: "bg-blue-100 text-blue-700" },
      shipped: { label: "Enviado", cls: "bg-indigo-100 text-indigo-700" },
      delivered: { label: "Entregue", cls: "bg-emerald-100 text-emerald-700" },
      canceled: { label: "Cancelado", cls: "bg-red-100 text-red-700" },
    };
    const m = map[s] || { label: s, cls: "bg-muted text-muted-foreground" };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.cls}`}>{m.label}</span>;
  };

  if (isLoading) {
    return <div className="space-y-4 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>;
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/admin/clientes")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={() => navigate("/admin/clientes")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-0">
        <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card - Left */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="admin-card border-0">
            <CardContent className="p-6 space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl font-bold mb-3">
                  {profile.avatar_url ? <img src={profile.avatar_url} className="w-20 h-20 rounded-full object-cover" alt="" /> : getInitials(profile.full_name)}
                </div>
                <h2 className="text-lg font-bold text-slate-800">{profile.full_name || "Sem nome"}</h2>
                {isVip && (
                  <span className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    <Crown className="w-3 h-3" /> VIP
                  </span>
                )}
                {customerIsAdmin && (
                  <span className="inline-flex items-center gap-1 mt-1 px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>

              {/* Admin toggle */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={customerIsAdmin ? "destructive" : "outline"}
                    size="sm"
                    className="w-full rounded-xl gap-2 text-xs"
                    disabled={toggleAdminMutation.isPending || userId === user?.id}
                  >
                    {customerIsAdmin ? <ShieldOff className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    {customerIsAdmin ? "Remover Admin" : "Tornar Admin"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>{customerIsAdmin ? "Remover permissão de admin?" : "Promover a admin?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {customerIsAdmin
                        ? `${profile.full_name || "Este usuário"} perderá acesso ao painel administrativo.`
                        : `${profile.full_name || "Este usuário"} terá acesso total ao painel administrativo.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="rounded-xl" onClick={() => toggleAdminMutation.mutate()}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Contact info */}
              <div className="space-y-3">
                {email && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{email}</span>
                    <button onClick={() => copyToClipboard(email)} className="min-h-0 min-w-0"><Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm flex-1">{formatPhone(profile.phone)}</span>
                  {profile.phone && (
                    <a href={whatsappUrl(profile.phone, profile.full_name)} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[11px] font-medium min-h-0">
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
                {profile.cpf && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <span className="text-[11px] font-medium text-muted-foreground">CPF</span>
                    <span className="text-sm flex-1">{profile.cpf}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">Desde {new Date(profile.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>

              {/* Quick KPIs */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Gasto", value: formatCurrency(totalSpent) },
                  { label: "Pedidos", value: orders.length },
                  { label: "Ticket Médio", value: formatCurrency(avgTicket) },
                  { label: "Favoritos", value: favorites.length },
                ].map(k => (
                  <div key={k.label} className="p-3 rounded-xl bg-muted/20 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{k.label}</p>
                    <p className="text-sm font-bold mt-0.5">{k.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs - Right */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2">
          <Tabs defaultValue="orders">
            <TabsList className="bg-muted/30 rounded-xl p-1 w-full flex flex-wrap gap-1 h-auto">
              <TabsTrigger value="orders" className="rounded-lg text-xs gap-1 flex-1"><ShoppingBag className="w-3.5 h-3.5" /> Compras</TabsTrigger>
              <TabsTrigger value="addresses" className="rounded-lg text-xs gap-1 flex-1"><MapPin className="w-3.5 h-3.5" /> Endereços</TabsTrigger>
              <TabsTrigger value="favorites" className="rounded-lg text-xs gap-1 flex-1"><Heart className="w-3.5 h-3.5" /> Favoritos</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-lg text-xs gap-1 flex-1"><StickyNote className="w-3.5 h-3.5" /> Notas</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-lg text-xs gap-1 flex-1"><Activity className="w-3.5 h-3.5" /> Atividade</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-4">
              <Card className="admin-card overflow-hidden">
                <CardContent className="p-0">
                  {orders.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhum pedido encontrado</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Pedido</th>
                            <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground hidden sm:table-cell">Data</th>
                            <th className="text-center px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</th>
                            <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Total</th>
                            <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs font-medium">#{o.order_number}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                              <td className="px-4 py-3 text-center">{statusLabel(o.status)}</td>
                              <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(o.total))}</td>
                              <td className="px-4 py-3 text-right">
                                <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs min-h-0" onClick={() => navigate(`/admin/pedidos/${o.id}`)}>Ver</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses" className="mt-4 space-y-3">
              {addresses.length === 0 ? (
                <Card className="admin-card">
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhum endereço cadastrado</p>
                  </CardContent>
                </Card>
              ) : addresses.map(a => (
                <Card key={a.id} className="admin-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{a.label}</p>
                          {a.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase">Padrão</span>}
                        </div>
                        <p className="text-sm text-muted-foreground">{a.recipient_name}</p>
                        <p className="text-sm text-muted-foreground">{a.street}, {a.number}{a.complement ? ` - ${a.complement}` : ""}</p>
                        <p className="text-sm text-muted-foreground">{a.neighborhood}, {a.city} - {a.state} | CEP: {a.zip_code}</p>
                      </div>
                      <MapPin className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites" className="mt-4">
              <Card className="admin-card overflow-hidden">
                <CardContent className="p-0">
                  {favorites.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <Heart className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhum favorito</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {favorites.map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{f.products?.name || "Produto"}</p>
                            <p className="text-xs text-muted-foreground">{f.products?.price ? formatCurrency(Number(f.products.price)) : ""}</p>
                          </div>
                          {f.products?.slug && (
                            <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs min-h-0" onClick={() => window.open(`/produto/${f.products.slug}`, "_blank")}>Ver</Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-4 space-y-3">
              <Card className="admin-card">
                <CardContent className="p-4 space-y-3">
                  <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Adicionar uma nota interna sobre este cliente..." className="rounded-xl border-0 bg-muted/30 resize-none" rows={3} />
                  <div className="flex justify-end">
                    <Button size="sm" className="rounded-xl gap-1.5" onClick={() => addNoteMutation.mutate()} disabled={!newNote.trim() || addNoteMutation.isPending}>
                      <Plus className="w-3.5 h-3.5" /> Adicionar Nota
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {notes.map((n: any) => (
                <Card key={n.id} className="admin-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                      <button onClick={() => deleteNoteMutation.mutate(n.id)} className="min-h-0 min-w-0 p-1 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma nota registrada</div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4">
              <Card className="admin-card">
                <CardContent className="p-4">
                  {events.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Activity className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhuma atividade registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events.map((ev: any) => (
                        <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-sm">{ev.description}</p>
                            <p className="text-[11px] text-muted-foreground">{new Date(ev.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
