import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos Pix, cartões de crédito (Visa, Mastercard, Elo, Amex) e boleto bancário. No Pix, você ganha desconto especial!" },
  { q: "Qual o prazo de entrega?", a: "O prazo varia conforme a região. Em média, entregas em 3 a 7 dias úteis para capitais e 5 a 12 dias úteis para demais localidades." },
  { q: "Posso trocar ou devolver um produto?", a: "Sim! Você tem até 30 dias após o recebimento para solicitar troca ou devolução, seguindo nossa política de trocas." },
  { q: "Os produtos possuem garantia?", a: "Todos os produtos possuem garantia contra defeitos de fabricação conforme o Código de Defesa do Consumidor." },
  { q: "Como acompanho meu pedido?", a: "Após o envio, você receberá o código de rastreamento por e-mail. Também pode acompanhar em Minha Conta > Pedidos." },
  { q: "Vocês têm loja física?", a: "Atualmente operamos exclusivamente online, o que nos permite oferecer os melhores preços e comodidade para nossos clientes." },
  { q: "Como funciona o desconto no Pix?", a: "O desconto no Pix é aplicado automaticamente no checkout. Basta selecionar Pix como forma de pagamento." },
  { q: "Como faço para usar um cupom de desconto?", a: "Insira o código do cupom no campo específico na página do carrinho ou durante o checkout. O desconto será aplicado automaticamente." },
];

export default function FaqPage() {
  return (
    <div className="container py-10 min-h-[60vh] max-w-3xl">
      <h1 className="text-3xl font-display font-bold mb-2">Perguntas Frequentes</h1>
      <p className="text-muted-foreground font-sans mb-8">Tire suas dúvidas sobre nossa loja</p>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border rounded-2xl px-5 bg-card shadow-sm">
            <AccordionTrigger className="font-sans text-sm font-medium hover:no-underline py-4">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="font-sans text-sm text-muted-foreground pb-4">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
