DROP POLICY IF EXISTS "Anyone can read calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Anyone can read calendar analysis" ON public.calendar_event_analysis;
DROP POLICY IF EXISTS "Anyone can read calendar sync state" ON public.calendar_sync_state;
REVOKE SELECT ON public.calendar_events, public.calendar_event_analysis, public.calendar_sync_state FROM anon;
GRANT SELECT ON public.calendar_events, public.calendar_event_analysis, public.calendar_sync_state TO authenticated;
GRANT ALL ON public.calendar_events, public.calendar_event_analysis, public.calendar_sync_state TO service_role;
CREATE POLICY "Signed-in users read calendar events" ON public.calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users read calendar analysis" ON public.calendar_event_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users read calendar sync state" ON public.calendar_sync_state FOR SELECT TO authenticated USING (true);