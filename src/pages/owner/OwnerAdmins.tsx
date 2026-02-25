import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Mail, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

function useAdminUsers() {
  return useQuery({
    queryKey: ["owner-admin-users"],
    queryFn: async () => {
      // Get all admin role entries
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin");
      if (rolesErr) throw rolesErr;

      if (!roles || roles.length === 0) return [];

      const userIds = roles.map((r: any) => r.user_id);

      // Get profiles for those users
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      if (profErr) throw profErr;

      return (profiles || []).map((p: any) => ({
        ...p,
        role: "admin",
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

export default function OwnerAdmins() {
  const { data: admins, isLoading } = useAdminUsers();

  const fadeUp = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35 } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Administradores</h1>
        <p className="text-slate-400 text-sm mt-1">Usuários com acesso administrativo à loja</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : !admins || admins.length === 0 ? (
        <motion.div {...fadeUp(0)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Nenhum administrador encontrado</p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin: any, i: number) => (
            <motion.div key={admin.id} {...fadeUp(i)}>
              <div className="group bg-white rounded-2xl border border-slate-100 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200">
                {/* Avatar + Name */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                    {(admin.full_name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                      {admin.full_name || "Sem nome"}
                    </h3>
                    <Badge className="mt-1 bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold uppercase">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-3">
                  {admin.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs text-slate-500">{admin.phone}</span>
                    </div>
                  )}
                  {admin.cpf && (
                    <div className="flex items-center gap-2.5">
                      <User className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-xs text-slate-500">{admin.cpf}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-xs text-slate-500">
                      Desde {format(new Date(admin.created_at), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
