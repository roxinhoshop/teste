// Validação rápida: registro, login e chamada autenticada usando Bearer
// Uso: UI opcional; este script confirma que os endpoints protegidos respondem com token

const fetch = require('node-fetch');

function randEmail() {
  return `cliente_${Date.now()}@exemplo.com`;
}

async function main() {
  const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3000';
  const email = randEmail();
  const senha = 'SenhaForte123!';
  const nome = 'Cliente Teste';

  function log(step, data) {
    try { console.log(`\n[${step}]`, JSON.stringify(data, null, 2)); } catch(_) { console.log(`[${step}]`, data); }
  }

  // 1) Registrar usuário
  let res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha })
  });
  let body = await res.json().catch(() => ({}));
  log('register:response', { status: res.status, body });
  if (res.status !== 201 || !body.success) {
    throw new Error('Falha no registro (esperado 201/success)');
  }

  // 2) Login
  res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  body = await res.json().catch(() => ({}));
  log('login:response', { status: res.status, body: { success: body.success, hasToken: !!body.token, user: body.user } });
  if (res.status !== 200 || !body.success || !body.token) {
    throw new Error('Falha no login (esperado 200/success + token)');
  }
  const token = String(body.token || '').trim();

  // 3) /api/auth/me com Bearer
  res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  body = await res.json().catch(() => ({}));
  log('auth_me:response', { status: res.status, body });
  if (!body.success || !body.user || body.user.email !== email) {
    throw new Error('Falha em /auth/me com Bearer');
  }

  // 4) Endpoint protegido: atualizar perfil (PUT /api/users/profile)
  const novoNome = 'Cliente Validado';
  res = await fetch(`${API_BASE}/api/users/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ nome: novoNome })
  });
  body = await res.json().catch(() => ({}));
  log('update_profile:response', { status: res.status, body });
  if (!(res.status === 200 && body && body.success)) {
    throw new Error('Falha ao atualizar perfil com Bearer');
  }

  // 5) Verificar /auth/me reflete alteração de nome
  res = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: 'Bearer ' + token } });
  body = await res.json().catch(() => ({}));
  log('auth_me_after_update:response', { status: res.status, body });
  if (!(body && body.success && body.user && body.user.nome && body.user.nome.includes('Cliente'))) {
    throw new Error('Alteração de nome não refletida em /auth/me');
  }

  console.log('\n✅ Validação concluída com sucesso. Token e endpoints protegidos OK.');
}

main().catch(err => {
  console.error('\n❌ Erro na validação:', err && err.message || err);
  process.exit(1);
});

