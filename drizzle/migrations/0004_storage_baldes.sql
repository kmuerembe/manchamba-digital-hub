-- ===== Baldes de fotografias: produtos e diagnósticos =====
--
-- A migração 0001 criou as políticas de `storage.objects` para os baldes
-- "produtos" e "diagnosticos", mas os baldes em si nunca foram criados. Sem eles,
-- qualquer upload devolve "Bucket not found" e a publicação de um anúncio falhava
-- com "Não foi possível publicar o anúncio" — depois do produto já inserido e com
-- as fotografias perdidas. O diagnóstico de culturas falhava pela mesma razão.
--
-- Correr no SQL editor do Supabase (ou `drizzle-kit migrate`). É idempotente:
-- pode ser repetido sem estragar nada.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('produtos', 'produtos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('diagnosticos', 'diagnosticos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Políticas (as mesmas da 0001, recriadas para esta migração poder correr duas vezes).
-- Cada conta só escreve dentro da pasta com o seu próprio ID de utilizador.
drop policy if exists "ver fotos machamba" on storage.objects;
create policy "ver fotos machamba" on storage.objects for select to anon, authenticated
  using (bucket_id in ('produtos','diagnosticos'));

drop policy if exists "enviar fotos machamba" on storage.objects;
create policy "enviar fotos machamba" on storage.objects for insert to authenticated
  with check (bucket_id in ('produtos','diagnosticos') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gerir as minhas fotos" on storage.objects;
create policy "gerir as minhas fotos" on storage.objects for update to authenticated
  using (bucket_id in ('produtos','diagnosticos') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "apagar as minhas fotos" on storage.objects;
create policy "apagar as minhas fotos" on storage.objects for delete to authenticated
  using (bucket_id in ('produtos','diagnosticos') and (storage.foldername(name))[1] = auth.uid()::text);

-- Verificação rápida:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets
--   where id in ('produtos','diagnosticos');
