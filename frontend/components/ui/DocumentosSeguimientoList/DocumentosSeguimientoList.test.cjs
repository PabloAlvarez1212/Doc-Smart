const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { loadBindings } = require('next/dist/build/swc');

async function loadComponent(file, request = async () => ({url: 'https://storage.test/firmada'})) {
    const source = fs.readFileSync(file, 'utf8');
    const bindings = await loadBindings();
    const {code} = await bindings.transform(source, {jsc: {parser: {syntax: 'ecmascript', jsx: true}, transform: {react: {runtime: 'automatic'}}}, module: {type: 'commonjs'}});
    const module = {exports: {}};
    const downloads = [];
    const document = {body: {appendChild() {}}, createElement: () => ({click() {downloads.push({href: this.href, nombre: this.download});}, remove() {}})};
    const customRequire = id => {
        if (id === 'react') return {...React, useRef: value => ({current: value}), useState: value => [value, () => {}]};
        if (id.endsWith('.css')) return {};
        if (id.includes('appointmentsServices')) return {obtenerUrlDocumentoSeguimientoService: request};
        if (id.includes('errrorUtils')) return {obtenerPrimerError: value => typeof value === 'string' ? value : ''};
        if (id.includes('/Button/')) return props => React.createElement('button', props, props.children);
        if (id.includes('DocumentosSeguimientoList')) return () => null;
        if (id.startsWith('.')) return require(path.resolve(path.dirname(file), id));
        return require(id);
    };
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {document, URL})(customRequire, module, module.exports);
    module.exports.default.downloads = downloads;
    return module.exports.default;
}

const docs = [{id: 11, nombre: 'consulta.pdf', content_type: 'application/pdf', tamano: 1234}, {id: 22, nombre: 'resultado.png', content_type: 'image/png', tamano: 5678}];
function buttons(tree) {
    if (!tree || typeof tree !== 'object') return [];
    return [...(tree.type === 'button' ? [tree] : []), ...React.Children.toArray(tree.props?.children).flatMap(buttons)];
}

test('cada documento muestra solo Descargar', async () => {
    const Component = await loadComponent(path.join(__dirname, 'DocumentosSeguimientoList.js'));
    const markup = renderToStaticMarkup(Component({citaId: 7, documentos: docs}));
    assert.ok(markup.includes('consulta.pdf') && markup.includes('resultado.png'));
    assert.equal((markup.match(/>Ver<\/button>/g) || []).length, 0);
    assert.equal((markup.match(/>Descargar<\/button>/g) || []).length, 2);
});

test('cada descarga solicita solamente el documento correcto, incluido Word', async () => {
    const calls = [];
    const Component = await loadComponent(path.join(__dirname, 'DocumentosSeguimientoList.js'), async (...args) => {calls.push(args); return {url: 'https://storage.test/firmada'};});
    const actions = buttons(Component({citaId: 7, documentos: docs}));
    for (const action of actions) await action.props.onClick();
    assert.deepEqual(calls, [[7, 11], [7, 22]]);
    assert.deepEqual(Component.downloads, [{href: 'https://storage.test/firmada', nombre: 'consulta.pdf'}, {href: 'https://storage.test/firmada', nombre: 'resultado.png'}]);
    await buttons(Component({citaId: 7, documentos: [{id: 33, nombre: 'x.doc', content_type: 'application/msword'}]}))[0].props.onClick();
    assert.deepEqual(calls.at(-1), [7, 33]);
});

test('bloquea dos clicks mientras se obtiene la firma', async () => {
    let release; let count = 0;
    const Component = await loadComponent(path.join(__dirname, 'DocumentosSeguimientoList.js'), () => {count++; return new Promise(resolve => {release = resolve;});});
    const actions = buttons(Component({citaId: 7, documentos: docs}));
    const pending = actions[0].props.onClick();
    await actions[0].props.onClick();
    assert.equal(count, 1);
    release({url: 'https://storage.test/firmada'}); await pending;
});

test('detalle de historial no muestra Descargar PDF global', async () => {
    const Component = await loadComponent(path.resolve(__dirname, '../../patient/MedicalHistory/Detail/MedicalHistoryDetail.js'));
    const markup = renderToStaticMarkup(Component({record: {fecha_creacion: '2026-10-09T15:00:00Z', version_actual: 1, documentos: []}}));
    assert.ok(!markup.includes('Descargar PDF'));
});
