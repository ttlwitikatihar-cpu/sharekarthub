
-- Enforce is_admin_reply only for admins on ticket_messages
CREATE OR REPLACE FUNCTION public.enforce_ticket_message_admin_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin_reply IS TRUE AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.is_admin_reply := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ticket_message_admin_flag ON public.ticket_messages;
CREATE TRIGGER trg_enforce_ticket_message_admin_flag
BEFORE INSERT OR UPDATE ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_message_admin_flag();

-- Prevent non-admin ticket parties from tampering with admin-only fields on support_tickets
CREATE OR REPLACE FUNCTION public.enforce_support_ticket_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot modify admin-only resolution fields
  NEW.resolved_by := OLD.resolved_by;
  NEW.resolved_at := OLD.resolved_at;
  NEW.resolution := OLD.resolution;
  NEW.priority := OLD.priority;
  NEW.category := OLD.category;

  -- Non-admins cannot set status to 'resolved'
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' THEN
    RAISE EXCEPTION 'Only admins can resolve tickets';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_support_ticket_updates ON public.support_tickets;
CREATE TRIGGER trg_enforce_support_ticket_updates
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_support_ticket_updates();
