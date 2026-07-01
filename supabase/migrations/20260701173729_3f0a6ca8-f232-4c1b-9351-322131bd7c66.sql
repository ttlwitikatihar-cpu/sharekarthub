
-- ============ SUPPORT TICKETS ============
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  raised_by uuid NOT NULL,
  against_user_id uuid NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties or admin can view tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    auth.uid() = raised_by
    OR auth.uid() = against_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can open tickets for their own orders"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = raised_by
    AND auth.uid() <> against_user_id
    AND (
      order_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id
          AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
      )
    )
  );

CREATE POLICY "Parties can update status, admin can update all"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = raised_by
    OR auth.uid() = against_user_id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = raised_by
    OR auth.uid() = against_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ TICKET MESSAGES ============
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  attachment_url text,
  is_system boolean NOT NULL DEFAULT false,
  is_admin_reply boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ticket_messages TO authenticated;
GRANT ALL ON public.ticket_messages TO service_role;

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket parties or admin can view messages"
  ON public.ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          auth.uid() = t.raised_by
          OR auth.uid() = t.against_user_id
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Ticket parties or admin can post messages"
  ON public.ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          auth.uid() = t.raised_by
          OR auth.uid() = t.against_user_id
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- ============ NOTIFY ON NEW TICKET / MESSAGE ============
CREATE OR REPLACE FUNCTION public.notify_on_ticket_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t public.support_tickets;
BEGIN
  IF TG_TABLE_NAME = 'support_tickets' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (NEW.against_user_id,
            'New Support Ticket',
            'A ticket was raised regarding: ' || NEW.subject,
            'warning');
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'ticket_messages' AND TG_OP = 'INSERT' THEN
    SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
    IF t.id IS NOT NULL THEN
      IF NEW.sender_id <> t.raised_by THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (t.raised_by, 'New Reply on Ticket',
                'New reply on: ' || t.subject, 'info');
      END IF;
      IF NEW.sender_id <> t.against_user_id THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (t.against_user_id, 'New Reply on Ticket',
                'New reply on: ' || t.subject, 'info');
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER support_tickets_notify
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_event();

CREATE TRIGGER ticket_messages_notify
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_event();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;

CREATE INDEX idx_tickets_raised_by ON public.support_tickets(raised_by);
CREATE INDEX idx_tickets_against ON public.support_tickets(against_user_id);
CREATE INDEX idx_tickets_order ON public.support_tickets(order_id);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id, created_at);
