with event_row as (
  insert into public.event_settings(event_name,event_date,event_time,location_name,city,instagram_url,whatsapp_url,active)
  values ('HALLOWEEN','2026-10-24','20h30','Campo do Alencar','Abaeté','https://instagram.com/halloween_abaete/','https://wa.me/553798702778',true)
  on conflict do nothing returning id
), selected_event as (
  select id from event_row union all select id from public.event_settings where active limit 1
)
insert into public.ticket_types(event_id,code,name,price_cents,max_per_order,active)
select id,'GENERAL','Ingresso geral',4500,5,true from selected_event
on conflict (event_id,code) do update set name=excluded.name, price_cents=excluded.price_cents, max_per_order=excluded.max_per_order, active=true;

insert into public.faqs(event_id,question,answer,sort_order)
select e.id, f.question, f.answer, f.sort_order from public.event_settings e cross join (values
  ('Como recebo meu ingresso?','Após a confirmação automática do Pix, o link seguro do pedido exibe um ingresso individual para cada entrada.',1),
  ('Como funciona o pagamento?','O pagamento é feito por Pix e confirmado diretamente com o Mercado Pago.',2),
  ('Preciso imprimir o ingresso?','Não. Apresente o QR Code na tela do celular.',3),
  ('O QR Code pode ser usado mais de uma vez?','Não. Cada QR Code permite apenas um check-in.',4)
) as f(question,answer,sort_order) where e.active;
