import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PoliciesPage() {
  return (
    <div className="container py-10 min-h-[60vh] max-w-4xl">
      <h1 className="text-3xl font-display font-bold mb-6">Políticas da Loja</h1>

      <Tabs defaultValue="privacy" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="privacy" className="font-sans text-xs">Privacidade</TabsTrigger>
          <TabsTrigger value="terms" className="font-sans text-xs">Termos de Uso</TabsTrigger>
          <TabsTrigger value="shipping" className="font-sans text-xs">Envio & Entregas</TabsTrigger>
          <TabsTrigger value="returns" className="font-sans text-xs">Trocas & Devoluções</TabsTrigger>
        </TabsList>

        <TabsContent value="privacy" className="prose prose-sm max-w-none font-sans text-muted-foreground space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">Política de Privacidade</h2>
          <p>Respeitamos sua privacidade e protegemos seus dados pessoais. Coletamos apenas informações necessárias para processar seus pedidos e melhorar sua experiência de compra.</p>
          <h3 className="font-semibold text-foreground">Dados coletados</h3>
          <p>Nome, e-mail, endereço de entrega, telefone e dados de pagamento (processados de forma segura por nossos parceiros de pagamento).</p>
          <h3 className="font-semibold text-foreground">Uso dos dados</h3>
          <p>Seus dados são utilizados exclusivamente para: processamento de pedidos, comunicação sobre status de pedidos, envio de promoções (mediante consentimento) e melhoria dos nossos serviços.</p>
          <h3 className="font-semibold text-foreground">Compartilhamento</h3>
          <p>Não compartilhamos seus dados com terceiros, exceto transportadoras (para entrega) e processadores de pagamento (para transações).</p>
        </TabsContent>

        <TabsContent value="terms" className="prose prose-sm max-w-none font-sans text-muted-foreground space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">Termos de Uso</h2>
          <p>Ao acessar e usar nossa loja, você concorda com os seguintes termos e condições.</p>
          <h3 className="font-semibold text-foreground">Produtos e Preços</h3>
          <p>Os preços podem ser alterados sem aviso prévio. As imagens são meramente ilustrativas. Nos reservamos o direito de limitar quantidades.</p>
          <h3 className="font-semibold text-foreground">Conta do Usuário</h3>
          <p>Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas com sua conta.</p>
          <h3 className="font-semibold text-foreground">Propriedade Intelectual</h3>
          <p>Todo o conteúdo da loja (textos, imagens, logos, design) é de nossa propriedade e protegido por leis de direitos autorais.</p>
        </TabsContent>

        <TabsContent value="shipping" className="prose prose-sm max-w-none font-sans text-muted-foreground space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">Política de Envio</h2>
          <h3 className="font-semibold text-foreground">Prazos</h3>
          <p>Capitais: 3 a 7 dias úteis. Demais localidades: 5 a 12 dias úteis. Prazo contado a partir da confirmação do pagamento.</p>
          <h3 className="font-semibold text-foreground">Frete Grátis</h3>
          <p>Frete grátis para compras acima de R$ 299,00 para todo o Brasil.</p>
          <h3 className="font-semibold text-foreground">Rastreamento</h3>
          <p>Após o envio, você receberá o código de rastreamento por e-mail para acompanhar sua entrega em tempo real.</p>
        </TabsContent>

        <TabsContent value="returns" className="prose prose-sm max-w-none font-sans text-muted-foreground space-y-4">
          <h2 className="font-display text-xl font-bold text-foreground">Trocas e Devoluções</h2>
          <h3 className="font-semibold text-foreground">Prazo</h3>
          <p>Você tem até 30 dias corridos após o recebimento para solicitar troca ou devolução.</p>
          <h3 className="font-semibold text-foreground">Condições</h3>
          <p>O produto deve estar em sua embalagem original, sem sinais de uso, com etiquetas intactas e acompanhado da nota fiscal.</p>
          <h3 className="font-semibold text-foreground">Reembolso</h3>
          <p>O reembolso será feito na mesma forma de pagamento utilizada na compra, em até 10 dias úteis após o recebimento do produto devolvido.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
