import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProfilePhoto } from './profilePhotoSource.mjs';

test('uses the supplied Cloudinary photo and upgrades insecure transport', () => {
 assert.equal(resolveProfilePhoto('http://res.cloudinary.com/uhhdi5jp/image/upload/foto.jpg'), 'https://res.cloudinary.com/uhhdi5jp/image/upload/foto.jpg');
});
test('resolves media paths against backend instead of the frontend host', () => {
 assert.equal(resolveProfilePhoto('/media/perfiles/foto.png', 'http://localhost:8000'), 'http://localhost:8000/media/perfiles/foto.png');
 assert.equal(resolveProfilePhoto('media/perfiles/foto.png', 'https://api.example.com/api/'), 'https://api.example.com/media/perfiles/foto.png');
});
test('preserves local fallback assets and safe remote URLs', () => {
 assert.equal(resolveProfilePhoto('/images/foto_default.png'), '/images/foto_default.png');
 assert.equal(resolveProfilePhoto('https://images.example.com/photo.png?v=2'), 'https://images.example.com/photo.png?v=2');
});
test('missing or invalid photo has an explicit fallback', () => {
 for(const value of [null,undefined,'','  ','javascript:alert(1)','//example.com/image','https://user:password@example.com/photo.png']) assert.equal(resolveProfilePhoto(value), '/images/foto_default.png');
});
