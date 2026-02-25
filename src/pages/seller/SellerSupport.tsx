import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageCircle, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerSupport() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Suporte</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">Precisa de ajuda? Estamos aqui!</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
              <MessageCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-semibold font-sans">WhatsApp</h3>
            <p className="text-xs text-muted-foreground font-sans">Fale com nosso time de suporte ao vendedor</p>
            <Button variant="outline" className="rounded-xl w-full" asChild>
              <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold font-sans">E-mail</h3>
            <p className="text-xs text-muted-foreground font-sans">Envie suas dúvidas por e-mail</p>
            <Button variant="outline" className="rounded-xl w-full" asChild>
              <a href="mailto:suporte@lizara.com.br">Enviar e-mail</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold font-sans">Perguntas frequentes</h3>
          </div>
          <div className="space-y-3 text-sm font-sans">
            <div><p className="font-medium">Como funciona a comissão?</p><p className="text-muted-foreground text-xs mt-1">Você recebe uma porcentagem sobre cada venda realizada pelo seu link. A comissão fica pendente até ser aprovada pelo administrador.</p></div>
            <div><p className="font-medium">Quando posso sacar?</p><p className="text-muted-foreground text-xs mt-1">Após o administrador aprovar suas comissões, você pode solicitar um saque na aba "Saques".</p></div>
            <div><p className="font-medium">Como compartilhar meu link?</p><p className="text-muted-foreground text-xs mt-1">Acesse "Meus Links" e copie seu link exclusivo. Compartilhe nas redes sociais, WhatsApp ou onde preferir.</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
