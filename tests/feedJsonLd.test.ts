// Guard for the build-time feed JSON-LD (W19). renderFeedJsonLd() generates the
// CollectionPage + Blog + BlogPosting[] graph injected into index.html by
// scripts/bodyBakePlugin.ts. This asserts the graph is valid JSON and stays in
// sync with the entry source (one BlogPosting per rendered entry). Run via
// `npm test` (tsx --test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderFeedJsonLd, getOrderedEntries } from '../scripts/prerenderBody.ts';

const entries = getOrderedEntries();
const raw = renderFeedJsonLd();
const graph = JSON.parse(raw) as { '@context': string; '@graph': any[] };

test('serialized JSON-LD is valid and escapes < for safe embedding', () => {
  assert.equal(graph['@context'], 'https://schema.org');
  assert.ok(Array.isArray(graph['@graph']));
  assert.ok(!raw.includes('</script'), 'must not contain a raw </script sequence');
});

test('entry titles containing </script are escaped and remain parseable', () => {
  const base = entries[0];
  const rawWithScriptTitle = renderFeedJsonLd([
    {
      ...base,
      slug: `${base.slug}-script-escape-test`,
      title: 'Synthetic title with </script in text',
    },
  ]);

  assert.ok(!rawWithScriptTitle.includes('</script'), 'must not contain a raw </script sequence');
  assert.ok(
    rawWithScriptTitle.includes('\\u003c/script'),
    'must contain the escaped \\u003c/script sequence',
  );
  assert.doesNotThrow(() => JSON.parse(rawWithScriptTitle), 'escaped JSON-LD must still parse');
});

test('webpage node is a CollectionPage', () => {
  const webpage = graph['@graph'].find((n) => String(n['@id']).endsWith('#webpage'));
  assert.ok(webpage, 'webpage node present');
  assert.ok(
    Array.isArray(webpage['@type']) && webpage['@type'].includes('CollectionPage'),
    'webpage @type includes CollectionPage',
  );
  assert.equal(webpage.mainEntity['@id'], 'https://www.danmercede.online/#blog');
});

test('Blog node lists one BlogPosting per entry, backlinking the hub Person', () => {
  const blog = graph['@graph'].find((n) => n['@type'] === 'Blog');
  assert.ok(blog, 'Blog node present');
  assert.equal(blog.author['@id'], 'https://www.danmercede.com/#person');
  assert.equal(blog.blogPost.length, entries.length, 'one BlogPosting per entry');
  for (const post of blog.blogPost) {
    assert.equal(post['@type'], 'BlogPosting');
    assert.ok(post.headline && post.datePublished && post.url, 'BlogPosting has headline/date/url');
    assert.equal(post.author['@id'], 'https://www.danmercede.com/#person');
    assert.equal(post.publisher['@id'], 'https://www.danmercede.com/#person');
    assert.equal(post.mainEntityOfPage['@id'], 'https://www.danmercede.online/#webpage');
  }
  // Sync check: first BlogPosting matches the newest ordered entry.
  assert.equal(blog.blogPost[0].headline, entries[0].title);
  assert.equal(blog.blogPost[0].url, `https://www.danmercede.online/#${entries[0].slug}`);
});
