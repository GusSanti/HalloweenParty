begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select has_table('public','orders','orders existe');
select has_column('public','orders','total_cents','pedidos guardam centavos');
select col_type_is('public','orders','total_cents','integer','total usa integer');
select has_index('public','webhook_events','webhook_events_provider_external_event_id_key','webhook é idempotente');
select has_function('public','atomic_check_in',array['uuid','uuid','text'],'check-in atômico existe');
select has_function('public','finalize_paid_order',array['uuid','text','integer','text'],'finalização idempotente existe');
select throws_ok($$insert into public.orders(event_id,ticket_type_id,buyer_name,buyer_email,buyer_phone,quantity,unit_price_cents,total_cents,access_token_hash,idempotency_key_hash) values (gen_random_uuid(),gen_random_uuid(),'Teste','t@e.com','37999999999',2,4500,100,'a','b')$$,'23503',null,'pedido sem referências válidas é rejeitado');

set local role anon;
select throws_ok($$select * from public.orders$$,'42501',null,'visitante não lê pedidos');
select throws_ok($$update public.tickets set checked_in_at=now()$$,'42501',null,'browser não altera check-in');

select * from finish();
rollback;
