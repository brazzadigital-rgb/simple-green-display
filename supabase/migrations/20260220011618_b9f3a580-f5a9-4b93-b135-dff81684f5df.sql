
-- ============================
-- VARIATION TEMPLATES SYSTEM
-- ============================

CREATE TABLE public.variation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.variation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage variation templates" ON public.variation_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read variation templates" ON public.variation_templates
  FOR SELECT USING (true);

CREATE TRIGGER update_variation_templates_updated_at
  BEFORE UPDATE ON public.variation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.variation_template_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.variation_templates(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'select',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.variation_template_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage template attributes" ON public.variation_template_attributes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read template attributes" ON public.variation_template_attributes
  FOR SELECT USING (true);

CREATE TABLE public.variation_template_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_attribute_id UUID NOT NULL REFERENCES public.variation_template_attributes(id) ON DELETE CASCADE,
  value_label TEXT NOT NULL,
  value_code TEXT,
  color_hex TEXT,
  price_delta NUMERIC DEFAULT 0,
  sku_suffix TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.variation_template_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage template values" ON public.variation_template_values
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read template values" ON public.variation_template_values
  FOR SELECT USING (true);

-- ============================
-- SEED 8 DEMO TEMPLATES
-- ============================

-- Template 1
WITH t AS (
  INSERT INTO public.variation_templates (name, description) VALUES ('Anéis (Aro)', 'Tamanhos de aro para anéis e alianças') RETURNING id
), a AS (
  INSERT INTO public.variation_template_attributes (template_id, attribute_name, input_type, sort_order) SELECT t.id, 'Tamanho', 'button', 0 FROM t RETURNING id
)
INSERT INTO public.variation_template_values (template_attribute_id, value_label, sku_suffix, sort_order)
SELECT a.id, v.label, v.suffix, v.ord FROM a, (VALUES ('Aro 10','-ARO10',0),('Aro 12','-ARO12',1),('Aro 14','-ARO14',2),('Aro 16','-ARO16',3),('Aro 18','-ARO18',4),('Aro 20','-ARO20',5),('Aro 22','-ARO22',6),('Aro 24','-ARO24',7)) AS v(label, suffix, ord);

-- Template 2
WITH t AS (
  INSERT INTO public.variation_templates (name, description) VALUES ('Colares (Comprimento da Corrente)', 'Comprimentos de corrente para colares') RETURNING id
), a AS (
  INSERT INTO public.variation_template_attributes (template_id, attribute_name, input_type, sort_order) SELECT t.id, 'Corrente', 'dropdown', 0 FROM t RETURNING id
)
INSERT INTO public.variation_template_values (template_attribute_id, value_label, sku_suffix, sort_order)
SELECT a.id, v.label, v.suffix, v.ord FROM a, (VALUES ('35cm','-35CM',0),('40cm','-40CM',1),('45cm','-45CM',2),('50cm','-50CM',3),('60cm','-60CM',4)) AS v(label, suffix, ord);

-- Template 3
WITH t AS (
  INSERT INTO public.variation_templates (name, description) VALUES ('Brincos (Par / Unidade)', 'Opção de par ou unidade para brincos') RETURNING id
), a AS (
  INSERT INTO public.variation_template_attributes (template_id, attribute_name, input_type, sort_order) SELECT t.id, 'Unidade', 'select', 0 FROM t RETURNING id
)
INSERT INTO public.variation_template_values (template_attribute_id, value_label, sku_suffix, sort_order)
SELECT a.id, v.label, v.suffix, v.ord FROM a, (VALUES ('Par','-PAR',0),('Unidade','-UN',1)) AS v(label, suffix, ord);

-- Template 4
WITH t AS (
  INSERT INTO public.variation_templates (name, description) VALUES ('Banho (Semijoias)', 'Tipos de banho para semijoias') RETURNING id
), a AS (
  INSERT INTO public.variation_template_attributes (template_id, attribute_name, input_type, sort_order) SELECT t.id, 'Banho', 'button', 0 FROM t RETURNING id
)
INSERT INTO public.variation_template_values (template_attribute_id, value_label, sku_suffix, sort_order)
SELECT a.id, v.label, v.suffix, v.ord FROM a, (VALUES ('Ouro 18k','-OURO18K',0),('Ródio Branco','-RODIO',1),('Ródio Negro','-RODIONEG',2),('Rosé Gold','-ROSE',3)) AS v(label, suffix, ord);

-- Template 5
WITH t AS (
  INSERT INTO public.variation_templates (name, description) VALUES ('Cor do Metal', 'Cores de metal com swatches visuais') RETURNING id
), a AS (
  INSERT INTO public.variation_template_attributes (template_id, attribute_name, input_type, sort_order) SELECT t.id, 'Cor do Metal', 'color', 0 FROM t RETURNING id
)
INSERT INTO public.variation_template_values (template_attribute_id, value_label, color_hex, sku_suffix, sort_order)
SELECT a.id, v.label, v.hex, v.suffix, v.ord FROM a, (VALUES ('Dourado','#D6B25E','-DOURADO',0),('Prata','#C9CED6','-PRATA',1),('Rosé','#D9A3A7','-ROSE',2),('Grafite','#4A4A4A','-GRAFITE',3)) AS v(label, hex, suffix, ord);

-- Template 6
WITH t AS (
  INSERT INTO public.variation_templates (name, description) VALUES ('Pedra', 'Tipos de pedra para joias') RETURNING id
), a AS (
  INSERT INTO public.variation_template_attributes (template_id, attribute_name, input_type, sort_order) SELECT t.id, 'Pedra', 'select', 0 FROM t RETURNING id
)
INSERT INTO public.variation_template_values (template_attribute_id, value_label, sku_suffix, sort_order)
SELECT a.id, v.label, v.suffix, v.ord FROM a, (VALUES ('Zircônia','-ZIRC',0),('Pérola','-PEROLA',1),('Cristal','-CRIST',2),('Sem pedra','-SEMPEDRA',3)) AS v(label, suffix, ord);

-- Template 7
WITH t AS (
  INSERT INTO public.variation_templates (name, description) VALUES ('Kit / Unidade', 'Formato de venda: unidade ou kit') RETURNING id
), a AS (
  INSERT INTO public.variation_template_attributes (template_id, attribute_name, input_type, sort_order) SELECT t.id, 'Formato', 'select', 0 FROM t RETURNING id
)
INSERT INTO public.variation_template_values (template_attribute_id, value_label, sku_suffix, sort_order)
SELECT a.id, v.label, v.suffix, v.ord FROM a, (VALUES ('Unidade','-UN',0),('Kit 2 peças','-KIT2',1),('Kit 3 peças','-KIT3',2),('Kit presente','-KITPRES',3)) AS v(label, suffix, ord);

-- Template 8
WITH t AS (
  INSERT INTO public.variation_templates (name, description) VALUES ('Personalização (Gravação)', 'Opção de gravação personalizada') RETURNING id
), a AS (
  INSERT INTO public.variation_template_attributes (template_id, attribute_name, input_type, sort_order) SELECT t.id, 'Gravação', 'select', 0 FROM t RETURNING id
)
INSERT INTO public.variation_template_values (template_attribute_id, value_label, price_delta, sku_suffix, sort_order)
SELECT a.id, v.label, v.delta::numeric, v.suffix, v.ord::integer FROM a, (VALUES ('Sem gravação','0','-SEMGRAV','0'),('Com gravação','15','-COMGRAV','1')) AS v(label, delta, suffix, ord);
