create policy "ver fotos machamba" on storage.objects for select to anon, authenticated
  using (bucket_id in ('produtos','diagnosticos'));
create policy "enviar fotos machamba" on storage.objects for insert to authenticated
  with check (bucket_id in ('produtos','diagnosticos') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "gerir as minhas fotos" on storage.objects for update to authenticated
  using (bucket_id in ('produtos','diagnosticos') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "apagar as minhas fotos" on storage.objects for delete to authenticated
  using (bucket_id in ('produtos','diagnosticos') and (storage.foldername(name))[1] = auth.uid()::text);