import assert from 'node:assert/strict';
import test from 'node:test';
import { agrixAccess, completeAgrixUsage } from './agrix-access.ts';

const secret = 's'.repeat(48);
const url = 'https://agrix.africa/api/gx/access';
const request = (cookie?: string) => new Request('https://gx.agrix.africa/api/chat', {
  headers: cookie ? { Cookie: cookie } : {},
});

test('Agrix access is optional only when it is not configured', async () => {
  assert.equal(await agrixAccess(request(), undefined, { url: '' }), null);
  assert.equal((await agrixAccess(request(), 'chat', { url, secret }))?.status, 401);
  assert.equal((await agrixAccess(request('agrix_user_token=x'), 'chat', { url: 'http://example.org/api/gx/access', secret }))?.status, 503);
});

test('Agrix validates the session and reserves the selected feature server to server', async () => {
  let called = 0;
  const result = await agrixAccess(request('agrix_user_token=signed-session'), 'analysis', {
    url, secret,
    fetcher: async (input, init) => {
      called += 1;
      assert.equal(input, url);
      assert.equal(init?.method, 'POST');
      assert.equal(new Headers(init?.headers).get('Cookie'), 'agrix_user_token=signed-session');
      assert.equal(new Headers(init?.headers).get('X-GX-Service-Secret'), secret);
      assert.deepEqual(JSON.parse(String(init?.body)), { feature: 'analysis' });
      return Response.json({ userId: 'agrix-user-1', plan: { id: 'decouverte', model: 'gpt-6-luna', images: false }, usageEventId: 'event-1' });
    },
  });
  assert.equal(called, 1);
  assert.deepEqual(result, { status: 200, identity: { userId: 'agrix-user-1', planId: 'decouverte', model: 'gpt-6-luna', images: false }, usageEventId: 'event-1' });
});

test('Agrix usage completion sends only model and token counts to the private API', async () => {
  let calls = 0;
  const completed = await completeAgrixUsage(request('agrix_user_token=signed-session'), 'event-1', 'succeeded', {
    response: { model: 'gpt-6-luna', usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 20 }, output_tokens: 40 }, output_text: 'private answer' },
    durationMs: 240,
  }, { url, secret, fetcher: async (input, init) => {
    calls += 1;
    assert.equal(input, url);
    assert.equal(init?.method, 'PATCH');
    assert.equal(new Headers(init?.headers).get('X-GX-Service-Secret'), secret);
    assert.deepEqual(JSON.parse(String(init?.body)), {
      usageEventId: 'event-1', status: 'succeeded', durationMs: 240,
      response: { model: 'gpt-6-luna', usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 20 }, output_tokens: 40 } },
    });
    return Response.json({ updated: true });
  } });
  assert.equal(completed, true);
  assert.equal(calls, 1);
});

test('Agrix quota and errors fail closed', async () => {
  const exhausted = await agrixAccess(request('agrix_user_token=signed'), 'chat', {
    url, secret, fetcher: async () => new Response(null, { status: 429 }),
  });
  assert.equal(exhausted?.status, 429);
  const broken = await agrixAccess(request('agrix_user_token=signed'), 'chat', {
    url, secret, fetcher: async () => { throw new Error('offline'); },
  });
  assert.equal(broken?.status, 503);
  const missingEvent = await agrixAccess(request('agrix_user_token=signed'), 'analysis', {
    url, secret, fetcher: async () => Response.json({ userId: 'agrix-user-1', plan: { id: 'decouverte', model: 'gpt-6-luna', images: true } }),
  });
  assert.equal(missingEvent?.status, 503);
  const notCompleted = await completeAgrixUsage(request('agrix_user_token=signed'), 'event-1', 'succeeded', {}, {
    url, secret, fetcher: async () => Response.json({ updated: false }),
  });
  assert.equal(notCompleted, false);
});
