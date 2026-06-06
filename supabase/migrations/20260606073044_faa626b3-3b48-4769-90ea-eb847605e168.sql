
CREATE POLICY "Users update own screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'screenshots' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'screenshots' AND (auth.uid())::text = (storage.foldername(name))[1]);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
