
-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_type text NOT NULL DEFAULT 'customer',
  recipient_user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'system',
  entity_type text NOT NULL DEFAULT 'none',
  entity_id uuid,
  priority text NOT NULL DEFAULT 'normal',
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  channel text NOT NULL DEFAULT 'inapp',
  data_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = recipient_user_id);

CREATE POLICY "Admins manage all notifications" ON public.notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System inserts notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  enable_inapp boolean NOT NULL DEFAULT true,
  enable_push boolean NOT NULL DEFAULT false,
  enable_sound boolean NOT NULL DEFAULT false,
  sound_volume integer NOT NULL DEFAULT 70,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_from text NOT NULL DEFAULT '22:00',
  quiet_to text NOT NULL DEFAULT '08:00',
  types_enabled_json jsonb NOT NULL DEFAULT '["order_new","payment_paid","order_shipped","order_delivered","refund","stock_low","system"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all preferences" ON public.notification_preferences
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL DEFAULT '',
  auth text NOT NULL DEFAULT '',
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subs" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger to auto-create notification on new order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _admin RECORD;
BEGIN
  -- Notify all admins
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (recipient_type, recipient_user_id, title, body, type, entity_type, entity_id, priority, data_json)
    VALUES ('admin', _admin.user_id, 'Novo pedido #' || NEW.order_number, 
            COALESCE(NEW.customer_name, 'Cliente') || ' - R$ ' || NEW.total,
            'order_new', 'order', NEW.id, 'high',
            jsonb_build_object('order_number', NEW.order_number, 'total', NEW.total));
  END LOOP;
  
  -- Notify customer
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_type, recipient_user_id, title, body, type, entity_type, entity_id, data_json)
    VALUES ('customer', NEW.user_id, 'Pedido confirmado!',
            'Seu pedido #' || NEW.order_number || ' foi recebido com sucesso.',
            'order_created', 'order', NEW.id,
            jsonb_build_object('order_number', NEW.order_number));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

-- Trigger for order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _admin RECORD;
  _title text;
  _body text;
  _type text;
  _priority text := 'normal';
BEGIN
  -- Only fire on status changes
  IF OLD.status = NEW.status AND OLD.payment_status = NEW.payment_status AND OLD.tracking_code IS NOT DISTINCT FROM NEW.tracking_code THEN
    RETURN NEW;
  END IF;

  -- Payment confirmed
  IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
    -- Admin
    FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (recipient_type, recipient_user_id, title, body, type, entity_type, entity_id, priority, data_json)
      VALUES ('admin', _admin.user_id, 'Pagamento confirmado #' || NEW.order_number,
              'R$ ' || NEW.total || ' - ' || COALESCE(NEW.payment_method, 'N/A'),
              'payment_paid', 'order', NEW.id, 'normal',
              jsonb_build_object('order_number', NEW.order_number));
    END LOOP;
    -- Customer
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_type, recipient_user_id, title, body, type, entity_type, entity_id, data_json)
      VALUES ('customer', NEW.user_id, 'Pagamento aprovado!',
              'O pagamento do pedido #' || NEW.order_number || ' foi confirmado.',
              'payment_paid', 'order', NEW.id,
              jsonb_build_object('order_number', NEW.order_number));
    END IF;
  END IF;

  -- Tracking code added
  IF OLD.tracking_code IS NULL AND NEW.tracking_code IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_type, recipient_user_id, title, body, type, entity_type, entity_id, data_json)
    VALUES ('customer', NEW.user_id, 'Pedido enviado! 📦',
            'Seu pedido #' || NEW.order_number || ' está a caminho. Rastreio: ' || NEW.tracking_code,
            'order_shipped', 'order', NEW.id,
            jsonb_build_object('order_number', NEW.order_number, 'tracking_code', NEW.tracking_code));
  END IF;

  -- Delivered
  IF OLD.status != 'delivered' AND NEW.status = 'delivered' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_type, recipient_user_id, title, body, type, entity_type, entity_id, data_json)
    VALUES ('customer', NEW.user_id, 'Pedido entregue! ✅',
            'Seu pedido #' || NEW.order_number || ' foi entregue com sucesso.',
            'order_delivered', 'order', NEW.id,
            jsonb_build_object('order_number', NEW.order_number));
  END IF;

  -- Canceled
  IF OLD.status != 'canceled' AND NEW.status = 'canceled' THEN
    FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (recipient_type, recipient_user_id, title, body, type, entity_type, entity_id, priority, data_json)
      VALUES ('admin', _admin.user_id, 'Pedido cancelado #' || NEW.order_number,
              COALESCE(NEW.customer_name, 'Cliente'), 'order_canceled', 'order', NEW.id, 'high',
              jsonb_build_object('order_number', NEW.order_number));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();
