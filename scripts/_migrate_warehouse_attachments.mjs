// Migra anexos legados (dataUrl base64) do almoxarifado para o Storage.
// - Lê data_json de cada projeto.
// - Para cada warehouse.movements[].attachments[] e custodyTerms[].attachments[],
//   se houver dataUrl, decodifica, faz upload para `daily-report-photos/${projectId}/warehouse/${id}.${ext}`,
//   e substitui por { storagePath, mimeType } removendo dataUrl.
// - Atualiza data_json no banco.

import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.SUPABASE_URL;
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SR_KEY) {
  console.error('Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supa = createClient(SB_URL, SR_KEY, { auth: { persistSession: false } });

const BUCKET = 'daily-report-photos';
const EXT_BY_MIME = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'image/gif': 'gif', 'application/pdf': 'pdf',
};

function parseDataUrl(dataUrl) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl || '');
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const isB64 = !!m[2];
  const payload = m[3] || '';
  const buf = isB64 ? Buffer.from(payload, 'base64') : Buffer.from(decodeURIComponent(payload), 'utf8');
  return { mime, buf };
}

function safeExt(name, mime) {
  const fromName = (name || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 5) return fromName;
  return EXT_BY_MIME[mime] || 'bin';
}

async function migrateAttachment(projectId, att) {
  if (!att?.dataUrl) return { att, changed: false, bytesFreed: 0 };
  const parsed = parseDataUrl(att.dataUrl);
  if (!parsed) {
    console.warn(`  ! anexo ${att.id} com dataUrl inválido — removendo apenas o dataUrl`);
    const { dataUrl: _drop, ...rest } = att;
    return { att: { ...rest, mimeType: rest.mimeType }, changed: true, bytesFreed: att.dataUrl.length };
  }
  const ext = safeExt(att.name, parsed.mime);
  const path = `${projectId}/warehouse/${att.id}.${ext}`;
  const { error } = await supa.storage
    .from(BUCKET)
    .upload(path, parsed.buf, { contentType: parsed.mime, upsert: true });
  if (error) {
    console.error(`  X falha upload ${path}:`, error.message);
    return { att, changed: false, bytesFreed: 0 };
  }
  const { dataUrl: _drop, ...rest } = att;
  const newAtt = { ...rest, storagePath: path, mimeType: parsed.mime };
  return { att: newAtt, changed: true, bytesFreed: att.dataUrl.length };
}

async function migrateAttachmentList(projectId, list) {
  if (!Array.isArray(list) || list.length === 0) return { list, changed: false, bytesFreed: 0 };
  let changedAny = false;
  let totalBytes = 0;
  const out = [];
  for (const att of list) {
    const r = await migrateAttachment(projectId, att);
    out.push(r.att);
    if (r.changed) changedAny = true;
    totalBytes += r.bytesFreed;
  }
  return { list: out, changed: changedAny, bytesFreed: totalBytes };
}

async function migrateProject(row) {
  const projectId = row.id;
  const data = row.data_json;
  if (!data?.warehouse) {
    console.log(`- ${projectId} ${row.name}: sem warehouse, pular`);
    return;
  }
  let totalBytes = 0;
  let touched = false;
  const wh = data.warehouse;

  if (Array.isArray(wh.movements)) {
    for (let i = 0; i < wh.movements.length; i++) {
      const mv = wh.movements[i];
      if (!mv?.attachments?.length) continue;
      const r = await migrateAttachmentList(projectId, mv.attachments);
      if (r.changed) { wh.movements[i] = { ...mv, attachments: r.list }; touched = true; totalBytes += r.bytesFreed; }
    }
  }
  if (Array.isArray(wh.custodyTerms)) {
    for (let i = 0; i < wh.custodyTerms.length; i++) {
      const ct = wh.custodyTerms[i];
      if (!ct?.attachments?.length) continue;
      const r = await migrateAttachmentList(projectId, ct.attachments);
      if (r.changed) { wh.custodyTerms[i] = { ...ct, attachments: r.list }; touched = true; totalBytes += r.bytesFreed; }
    }
  }

  if (!touched) {
    console.log(`- ${projectId} ${row.name}: nada para migrar`);
    return;
  }
  console.log(`> ${projectId} ${row.name}: liberando ~${(totalBytes/1024/1024).toFixed(2)} MB de dataUrl`);
  const { error } = await supa
    .from('projects')
    .update({ data_json: data })
    .eq('id', projectId);
  if (error) {
    console.error(`  X falha update projeto:`, error.message);
    return;
  }
  console.log(`  ✓ projeto atualizado`);
}

async function main() {
  const { data: rows, error } = await supa
    .from('projects')
    .select('id, name, data_json');
  if (error) { console.error('Falha listar projetos:', error.message); process.exit(1); }
  console.log(`Encontrados ${rows.length} projeto(s).`);
  for (const row of rows) {
    await migrateProject(row);
  }
  console.log('Pronto.');
}

main().catch(e => { console.error(e); process.exit(1); });
