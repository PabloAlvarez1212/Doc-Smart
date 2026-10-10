import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { themeBootstrap } from './themeScript.js';
function boot(saved, dark, blocked = false) {
  const document = {
    documentElement: {
      dataset: {},
      style: {}
    }
  };
  vm.runInNewContext(themeBootstrap, {
    document,
    localStorage: {
      getItem() {
        if (blocked) throw new Error('blocked');
        return saved;
      }
    },
    matchMedia: () => ({
      matches: dark
    })
  });
  return document.documentElement;
}
test('theme applies saved preference before rendering regardless of system', () => {
  assert.equal(boot('light', true).dataset.theme, 'light');
  assert.equal(boot('dark', false).dataset.theme, 'dark');
});
test('system preference, unknown values and first visit follow OS', () => {
  for (const value of ['system', 'invalid', null]) {
    assert.equal(boot(value, true).dataset.theme, 'dark');
    assert.equal(boot(value, false).dataset.theme, 'light');
  }
});
test('unavailable local storage still applies OS theme and native control scheme', () => {
  assert.equal(boot(null, true, true).style.colorScheme, 'dark');
  assert.equal(boot(null, false, true).dataset.theme, 'light');
});
