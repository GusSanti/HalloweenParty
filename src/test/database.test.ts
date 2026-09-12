// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite()
const attendee = '00000000-0000-4000-8000-000000000001'
const other = '00000000-0000-4000-8000-000000000002'
const admin = '00000000-0000-4000-8000-000000000003'
const gate = '00000000-0000-4000-8000-000000000004'
async function asUser(id: string, sql: string) {
  await db.exec("set role authenticated")
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
  try { return await db.query(sql) } finally { await db.exec('reset role') }
}
beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text);
    alter table storage.objects enable row level security;
  `)
  // pgcrypto is not needed by the final UUID-based generator. PGlite has no
  // Supabase extensions; Auth/Storage above simulate only their schema contract.
  for (const path of ['supabase/SUPABASE_SETUP.sql','supabase/migrations/202609120002_secure_integration.sql']) {
    const sql = readFileSync(path,'utf8').replace(/create extension if not exists pgcrypto[^;]*;/gi, '')
    await db.exec(sql)
  }
  for (const [id, name] of [[attendee,'Maria'],[other,'Joana'],[admin,'Admin'],[gate,'Portaria']]) {
    await db.query("insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())",
      [id, name + '@example.com', JSON.stringify({full_name:name,phone:'37999999999'})])
  }
  await db.query("insert into public.staff_profiles(user_id,role) values($1,'admin'),($2,'gate')",[admin,gate])
}, 30000)
afterAll(async () => { await db.close() })
describe('PostgreSQL: isolamento e convites', () => {
  it('valida metadata no servidor antes do cadastro', async () => {
    await expect(db.exec("insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'bad@example.com','{\"full_name\":\"X\",\"phone\":\"1\"}')")).rejects.toThrow('invalid_attendee_metadata')
  })
  it('gera apenas um convite por usuário e evento', async () => {
    const first = await asUser(attendee,'select public.ensure_my_invitation() as id')
    const second = await asUser(attendee,'select public.ensure_my_invitation() as id')
    expect(first.rows).toEqual(second.rows)
    await asUser(other,'select public.ensure_my_invitation()')
    const codes = await db.query<{code:string}>('select code from invitations')
    expect(codes.rows).toHaveLength(2)
    expect(codes.rows.every(row => /^H26-[A-F0-9]{32}$/.test(row.code))).toBe(true)
  })
  it('convidado só lê seu registro e não promove a si próprio', async () => {
    const rows = await asUser(attendee,'select * from public.invitations')
    expect(rows.rows).toHaveLength(1)
    await expect(asUser(attendee,"update public.invitations set status='active'")).rejects.toThrow()
    await expect(asUser(attendee,"insert into public.staff_profiles(user_id,role) values(auth.uid(),'admin')")).rejects.toThrow()
    await expect(asUser(attendee,"select public.set_invitation_status((select id from invitations limit 1),'active')")).rejects.toThrow('forbidden')
    await expect(asUser(attendee,'truncate public.invitations cascade')).rejects.toThrow()
  })
  it('visitantes não acessam cadastros', async () => {
    await db.exec('set role anon')
    try { await expect(db.exec('select * from attendee_profiles')).rejects.toThrow() }
    finally { await db.exec('reset role') }
  })
  it('não provisiona convite sem confirmação de e-mail', async () => {
    const id = '00000000-0000-4000-8000-000000000005'
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'unconfirmed@example.com',$2)",
      [id, JSON.stringify({ full_name:'Sem confirmação',phone:'37999999999' })])
    await expect(asUser(id,'select public.ensure_my_invitation()')).rejects.toThrow('email_not_confirmed')
    expect((await db.query('select id from invitations where attendee_user_id=$1',[id])).rows).toHaveLength(0)
  })
  it('bloqueia baixa pendente, portaria ativando e segunda baixa', async () => {
    const { rows } = await db.query<{id:string;code:string}>('select id,code from invitations where attendee_user_id=$1',[attendee])
    const { id, code } = rows[0]
    await expect(asUser(admin, "select public.set_invitation_status('" + id + "','used')")).rejects.toThrow('invalid_invitation_state')
    await expect(asUser(gate, "select public.set_invitation_status('" + id + "','active')")).rejects.toThrow('forbidden')
    await asUser(admin, "select public.set_invitation_status('" + id + "','active')")
    const first = await asUser(gate,"select public.check_in_invitation('H26:" + code + "') as result")
    expect(first.rows[0]).toMatchObject({ result: { result:'success' } })
    const second = await asUser(gate,"select public.check_in_invitation('" + code + "') as result")
    expect(second.rows[0]).toMatchObject({ result: { result:'already_used' } })
    const audit = await db.query('select * from audit_logs')
    expect(audit.rows).toHaveLength(2)
    await db.query('update staff_profiles set active=false where user_id=$1',[gate])
    await expect(asUser(gate,"select public.check_in_invitation('" + code + "')")).rejects.toThrow('forbidden')
  })
})
