const os = require('node:os');
const packagePath = process.env.DOCSMART_PLAYWRIGHT_PATH || require('node:path').join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(packagePath);
}
const {
  chromium
} = playwright;
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const path = require('node:path');
let activeBrowser;
(async () => {
  const output = path.resolve(__dirname, '../../.impeccable/review');
  await fs.mkdir(output, {
    recursive: true
  });
  const browser = activeBrowser = await chromium.launch({
    executablePath: process.env.DOCSMART_BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  const errors = [];
  const context = await browser.newContext({
    viewport: {
      width: 1440,
      height: 1000
    },
    colorScheme: 'light'
  });
  const page = await context.newPage();
  page.on('pageerror', e => {
    errors.push(e.message);
    console.error('Browser error:', e.message);
  });
  let metrics = 'ready',
    session = null,
    role = null;
  await context.routeWebSocket(/\/ws\//, ws => ws.close());
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const json = data => route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: data
    });
    if (url.pathname.endsWith('/public/metrics/')) {
      if (metrics === 'error') return route.fulfill({
        status: 503,
        json: {
          ok: false
        }
      });
      return json({
        ok: true,
        data: {
          pacientes_registrados: metrics === 'empty' ? 0 : 3,
          medicos_aprobados: metrics === 'empty' ? 0 : 1,
          citas_registradas: metrics === 'empty' ? 0 : 2,
          actualizado_en: '2026-10-09T12:00:00Z'
        }
      });
    }
    if (url.pathname.endsWith('/session-summary/')) return session ? json({
      ok: true,
      data: {
        home: session
      }
    }) : route.fulfill({
      status: 401,
      json: {
        ok: false
      }
    });
    if (url.pathname.endsWith('/chatbot/identidad/')) return route.fulfill({
      status: 503,
      json: {
        ok: false,
        mensaje: 'Dependencia de prueba no disponible'
      }
    });
    if (url.pathname.endsWith('/chatbot/chats/')) return json({
      ok: true,
      data: route.request().method() === 'POST' ? {
        id: 101
      } : [{
        id: 101,
        titulo: 'Conversación de prueba'
      }]
    });
    if (url.pathname.includes('/chatbot/chats/101/')) return json({
      ok: true,
      data: []
    });
    if (url.pathname.endsWith('/medicos/perfil/')) return json({
      ok: true,
      data: {
        id: 42,
        nombre: 'Cuenta de prueba',
        apellido: '',
        rol: 'medico',
        estado_validacion: 'aprobado'
      }
    });
    if (url.pathname.endsWith('/perfil/')) return json({
      ok: true,
      data: {
        id: 43,
        nombre: 'Cuenta de prueba',
        apellido: '',
        rol: 'paciente'
      }
    });
    if (url.pathname.endsWith('/medicos/dashboard/inicio/')) return json({
      ok: true,
      data: {
        id: 42,
        usuario: 'Cuenta de prueba',
        especialidad: 'Medicina general',
        estadisticas: {
          pacientes_totales: 2,
          citas_hoy: 0,
          diagnosticos: 1,
          notificaciones_no_leidas: 0
        },
        citas_hoy: [],
        proximas_citas: [],
        notificaciones: []
      }
    });
    if (url.pathname.endsWith('/dashboard/inicio/paciente/')) return json({
      ok: true,
      data: {
        id: 43,
        usuario: 'Cuenta de prueba',
        estadisticas: {
          cantidad_proximas_citas: 0,
          consultas_pendientes: 0,
          consultas_realizadas_mes: 0,
          consultas_canceladas_mes: 0
        },
        proximas_citas: []
      }
    });
    if (url.pathname.endsWith('/csrf/')) return json({
      ok: true,
      data: {
        csrf_token: 'browser-test-fixture'
      }
    });
    if (url.pathname.endsWith('/refresh/')) return route.fulfill({
      status: 401,
      json: {
        ok: false
      }
    });
    return json({
      ok: true,
      data: []
    });
  });
  const go = async () => {
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle'
    });
    await page.getByRole('heading', {
      name: 'Tu salud, más inteligente.'
    }).waitFor();
  };
  const overflow = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label + ' overflows');
  await go();
  await page.getByText('Comprobando sesión…').waitFor({
    state: 'hidden'
  });
  await overflow('desktop');
  await page.screenshot({
    path: path.join(output, 'desktop.png'),
    fullPage: true
  });
  await page.evaluate(value => {localStorage.setItem('docsmart-theme', value);window.dispatchEvent(new CustomEvent('docsmart:theme',{detail:value}));}, 'dark');
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.screenshot({
    path: path.join(output, 'desktop-dark.png'),
    fullPage: true
  });
  await page.reload({
    waitUntil: 'networkidle'
  });
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.setViewportSize({
    width: 390,
    height: 844
  });
  await page.evaluate(() => scrollTo(0, 0));
  await overflow('mobile');
  const menu = page.getByRole('button', {
    name: /Abrir menú|Cerrar menú/
  });
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  await page.getByRole('link', {
    name: 'Funcionalidades',
    exact: true
  }).waitFor({
    state: 'visible'
  });
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.equal(await menu.evaluate(el => document.activeElement === el), true);
  await page.screenshot({
    path: path.join(output, 'mobile-dark.png'),
    fullPage: true
  });
  await menu.click();
  await page.evaluate(value => {localStorage.setItem('docsmart-theme', value);window.dispatchEvent(new CustomEvent('docsmart:theme',{detail:value}));}, 'light');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.screenshot({
    path: path.join(output, 'mobile.png'),
    fullPage: true
  });
  await page.setViewportSize({
    width: 834,
    height: 1112
  });
  await overflow('tablet');
  await page.screenshot({
    path: path.join(output, 'tablet.png'),
    fullPage: true
  });
  await page.setViewportSize({
    width: 320,
    height: 700
  });
  await overflow('small mobile');
  await page.setViewportSize({
    width: 834,
    height: 1112
  });
  await page.emulateMedia({
    reducedMotion: 'reduce',
    colorScheme: 'dark'
  });
  await menu.click();
  await page.evaluate(value => {localStorage.setItem('docsmart-theme', value);window.dispatchEvent(new CustomEvent('docsmart:theme',{detail:value}));}, 'system');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.emulateMedia({
    colorScheme: 'light'
  });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  metrics = 'error';
  await go();
  await page.getByRole('button', {
    name: 'Volver a intentar',
    exact: true
  }).click();
  await page.getByText('No pudimos cargar las estadísticas.', {
    exact: true
  }).waitFor();
  metrics = 'empty';
  await page.getByRole('button', {
    name: 'Volver a intentar',
    exact: true
  }).click();
  await page.getByText('Todavía no hay registros en la plataforma.', {
    exact: true
  }).waitFor();
  metrics = 'ready';
  for (const home of ['/patient/home', '/doctor/home', '/admin/dashboard', '/doctor/validacion']) {
    session = home;
    await go();
    assert.equal(await page.getByRole('link', {
      name: 'Mi espacio',
      exact: true
    }).getAttribute('href'), home);
  }
  session = null;
  await page.goto('http://localhost:3000/login', {
    waitUntil: 'networkidle'
  });
  await overflow('login tablet');
  await page.screenshot({
    path: path.join(output, 'login.png'),
    fullPage: true
  });
  await page.evaluate(() => {
    localStorage.setItem('docsmart-theme', 'dark');
  });
  await page.reload({
    waitUntil: 'networkidle'
  });
  await page.screenshot({
    path: path.join(output, 'login-dark.png'),
    fullPage: true
  });
  await overflow('dark login');
  await page.setViewportSize({
    width: 1440,
    height: 1000
  });
  await page.goto('http://localhost:3000/doctor/dashboard', {
    waitUntil: 'networkidle'
  });
  await page.getByRole('heading', {
    name: 'Tu práctica, en perspectiva.'
  }).waitFor();
  await overflow('doctor dashboard');
  await page.screenshot({
    path: path.join(output, 'doctor-dashboard-dark.png'),
    fullPage: true
  });
  await page.getByRole('button', {
    name: 'Abrir Configuración',
    exact: true
  }).click();
  await page.getByRole('dialog').filter({
    has: page.getByRole('heading', {
      name: 'Acciones',
      exact: true
    })
  }).waitFor();
  await page.screenshot({
    path: path.join(output, 'settings-dark.png'),
    fullPage: true
  });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({
    state: 'hidden'
  });
  await page.getByRole('button', {
    name: /Abrir Bymax/
  }).press('Enter');
  await page.locator('#bymax-chat').waitFor({
    state: 'attached'
  });
  await page.getByRole('dialog', {
    name: 'Chat con Bymax',
    exact: true
  }).waitFor();
  await page.screenshot({
    path: path.join(output, 'bymax-dark.png'),
    fullPage: true
  });
  await page.goto('http://localhost:3000/patient/home', {
    waitUntil: 'networkidle'
  });
  await overflow('patient home dark');
  await page.screenshot({
    path: path.join(output, 'patient-home-dark.png'),
    fullPage: true
  });
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile/tablet overflow, theme persistence/system, reduced motion, menu/Escape/focus, aggregate empty/error/retry, session roles. API responses are isolated browser test fixtures.');
  await browser.close();
})().catch(async error => {
  console.error(error);
  await activeBrowser?.close();
  process.exitCode = 1;
});
