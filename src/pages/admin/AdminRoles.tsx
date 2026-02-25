import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Shield, Pencil, Trash2, Save, UserPlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const MODULES = ["Produtos", "Pedidos", "Clientes", "Financeiro", "Relatórios", "Cupons", "Configurações", "Fornecedores", "Comissões"];
const PERMS = ["can_view", "can_create", "can_edit", "can_delete", "can_export"] as const;
const PERM_LABELS: Record<string, string> = { can_view: "Ver", can_create: "Criar", can_edit: "Editar", can_delete: "Excluir", can_export: "Exportar" };

interface Role { id: string; name: string; description: string | null; is_system: boolean; }
interface RolePerm { id: string; role_id: string; module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean; can_export: boolean; }

export default function AdminRoles() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [perms, setPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_roles").select("*").order("created_at");
      if (error) throw error;
      return data as Role[];
    },
  });

  const { data: rolePerms = [] } = useQuery({
    queryKey: ["admin-role-perms", selectedRole?.id],
    enabled: !!selectedRole,
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("*").eq("role_id", selectedRole!.id);
      if (error) throw error;
      const map: Record<string, Record<string, boolean>> = {};
      MODULES.forEach(m => { map[m] = { can_view: false, can_create: false, can_edit: false, can_delete: false, can_export: false }; });
      (data as RolePerm[]).forEach(p => { if (map[p.module]) { PERMS.forEach(k => { map[p.module][k] = p[k]; }); } });
      setPerms(map);
      return data as RolePerm[];
    },
  });

  const { data: assignedUsers = [] } = useQuery({
    queryKey: ["admin-role-users", selectedRole?.id],
    enabled: !!selectedRole,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_custom_roles" as any).select("id, user_id, assigned_at").eq("custom_role_id", selectedRole!.id);
      if (error) throw error;
      const rows = data as any[];
      if (rows.length === 0) return [];
      const userIds = rows.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return rows.map((r: any) => ({ ...r, full_name: profiles?.find((p: any) => p.user_id === r.user_id)?.full_name || "Sem nome" }));
    },
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["search-users-for-role", searchEmail],
    enabled: searchEmail.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").ilike("full_name", `%${searchEmail}%`).limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("custom_roles").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custom_roles").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-roles"] }); setDialogOpen(false); toast({ title: "Função salva" }); },
  });

  const savePermsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      await supabase.from("role_permissions").delete().eq("role_id", selectedRole.id);
      const rows = MODULES.map(m => ({ role_id: selectedRole.id, module: m, ...perms[m] }));
      const { error } = await supabase.from("role_permissions").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-role-perms"] }); toast({ title: "Permissões salvas" }); },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-roles"] }); if (selectedRole) setSelectedRole(null); toast({ title: "Função removida" }); },
  });

  const assignUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!selectedRole) return;
      const { error } = await supabase.from("user_custom_roles" as any).insert({ user_id: userId, custom_role_id: selectedRole.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-role-users"] }); setSearchEmail(""); toast({ title: "Usuário atribuído" }); },
    onError: (err: any) => { toast({ title: "Erro", description: err.message?.includes("duplicate") ? "Usuário já possui esta função" : err.message, variant: "destructive" }); },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_custom_roles" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-role-users"] }); toast({ title: "Usuário removido da função" }); },
  });

  const openNew = () => { setEditing(null); setForm({ name: "", description: "" }); setDialogOpen(true); };
  const openEdit = (r: Role) => { setEditing(r); setForm({ name: r.name, description: r.description || "" }); setDialogOpen(true); };
  const togglePerm = (mod: string, perm: string) => { setPerms(prev => ({ ...prev, [mod]: { ...prev[mod], [perm]: !prev[mod]?.[perm] } })); };
  const alreadyAssigned = assignedUsers.map((u: any) => u.user_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funções e Permissões</h1>
          <p className="text-sm text-muted-foreground">Configure perfis de acesso ao sistema</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Nova Função
        </Button>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Roles list */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
          <Card className="admin-card p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Funções</p>
            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  selectedRole?.id === r.id ? "bg-accent/10 text-accent font-bold border border-accent/20" : "text-foreground hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{r.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {r.is_system && <Badge variant="secondary" className="text-[10px]">Sistema</Badge>}
                  {!r.is_system && (
                    <>
                      <Button variant="ghost" size="icon" className="w-6 h-6" onClick={e => { e.stopPropagation(); openEdit(r); }}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive" onClick={e => { e.stopPropagation(); deleteRoleMutation.mutate(r.id); }}><Trash2 className="w-3 h-3" /></Button>
                    </>
                  )}
                </div>
              </button>
            ))}
          </Card>
        </motion.div>

        {/* Permissions + Users */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="admin-card p-4">
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Shield className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Selecione uma função para configurar permissões</p>
              </div>
            ) : (
              <Tabs defaultValue="permissions">
                <TabsList className="mb-4 bg-muted/50 p-1 rounded-xl">
                  <TabsTrigger value="permissions" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Permissões</TabsTrigger>
                  <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Usuários ({assignedUsers.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="permissions">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-display font-bold text-lg">Permissões: {selectedRole.name}</p>
                    <Button onClick={() => savePermsMutation.mutate()} disabled={savePermsMutation.isPending} className="rounded-xl gap-2" size="sm">
                      <Save className="w-4 h-4" /> Salvar
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Módulo</th>
                          {PERMS.map(p => <th key={p} className="text-center px-3 py-2 font-semibold text-muted-foreground">{PERM_LABELS[p]}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map(mod => (
                          <tr key={mod} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="px-3 py-2.5 font-medium">{mod}</td>
                            {PERMS.map(p => (
                              <td key={p} className="text-center px-3 py-2.5">
                                <Checkbox checked={perms[mod]?.[p] || false} onCheckedChange={() => togglePerm(mod, p)} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="users">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-display font-bold text-lg">Usuários: {selectedRole.name}</p>
                    <Button onClick={() => setAssignDialogOpen(true)} className="rounded-xl gap-2" size="sm">
                      <UserPlus className="w-4 h-4" /> Atribuir
                    </Button>
                  </div>
                  {assignedUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum usuário atribuído a esta função.</p>
                  ) : (
                    <div className="space-y-2">
                      {assignedUsers.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20">
                          <div>
                            <p className="text-sm font-medium">{u.full_name}</p>
                            <p className="text-xs text-muted-foreground">Atribuído em {new Date(u.assigned_at).toLocaleDateString("pt-BR")}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => removeUserMutation.mutate(u.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </Card>
        </motion.div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">{editing ? "Editar Função" : "Nova Função"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl border-0 bg-muted/30" /></div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl border-0 bg-muted/30" /></div>
            <Button onClick={() => saveRoleMutation.mutate()} disabled={!form.name || saveRoleMutation.isPending} className="rounded-xl">
              {saveRoleMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="font-display">Atribuir Usuário à Função</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Buscar por nome</Label>
              <Input placeholder="Digite o nome do usuário..." value={searchEmail} onChange={e => setSearchEmail(e.target.value)} className="rounded-xl border-0 bg-muted/30" />
            </div>
            {searchEmail.length >= 2 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum usuário encontrado.</p>
                ) : searchResults.map((u: any) => {
                  const isAssigned = alreadyAssigned.includes(u.user_id);
                  return (
                    <div key={u.user_id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50">
                      <span className="text-sm">{u.full_name || "Sem nome"}</span>
                      {isAssigned ? (
                        <Badge variant="secondary" className="text-[10px]">Já atribuído</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => assignUserMutation.mutate(u.user_id)}>Atribuir</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
