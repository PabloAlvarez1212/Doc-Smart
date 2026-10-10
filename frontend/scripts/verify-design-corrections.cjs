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
  const output = path.resolve(__dirname, '../../.impeccable/corrections');
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
  let docMode='error', otpMode='error', completeMode='error', loginMode='error';
  const requests={};
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
    requests[url.pathname]=(requests[url.pathname]||0)+1;
    const fail=mensaje=>route.fulfill({status:400,json:{ok:false,mensaje}});
    if(url.pathname.endsWith('/login/')){await new Promise(r=>setTimeout(r,800));return loginMode==='error'?fail('Credenciales incorrectas. Revisa correo y contraseña.'):json({ok:true,message:'Sesión iniciada',data:{rol:'paciente',nombre:'Cuenta',apellido:'de prueba'}})}
    if(url.pathname.endsWith('/perfil/admin/'))return json({ok:true,data:{id:44,rol:'admin',nombre:'Cuenta de prueba'}});
    if(url.pathname.endsWith('/medicos/especialidades/'))return json({ok:true,data:[{id:1,nombre:'Medicina general'}]});
    if(url.pathname.endsWith('/catalogos/departamentos/'))return json({ok:true,data:[{id:1,nombre:'Bogotá'}]});
    if(url.pathname.endsWith('/departamentos/1/ciudades/'))return json({ok:true,data:[{id_ciudad:1,nombre_ciudad:'Bogotá'}]});
    if(url.pathname.endsWith('/usuarios/registro/'))return json({ok:true,data:{proceso_id:'browser-fixture'}});
    if(url.pathname.endsWith('/registro/documento/verificar/')){await new Promise(r=>setTimeout(r,800));return docMode==='error'?fail('Documento ilegible. Carga una imagen más clara y reintenta.'):json({ok:true,data:{documento_verificado:docMode==='success'}})}
    if(url.pathname.endsWith('/registro/verificar-correo/')){await new Promise(r=>setTimeout(r,800));return otpMode==='error'?fail('Código incorrecto. Revisa el código enviado a tu correo.'):json({ok:true,data:{correo_verificado:otpMode==='success'}})}
    if(url.pathname.endsWith('/registro/completar/'))return completeMode==='error'?fail('No se pudo completar. Reintenta.'):json({ok:true,data:{registro_completo:true}});
    if(url.pathname.includes('/usuarios/registro/'))return json({ok:true,data:{}});
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
        proximas_citas: [{id:7,estado:'confirmada',fecha_programada:'2027-10-15T15:00:00Z',medico:'Profesional de prueba',especialidad:'Medicina general',ciudad:'Bogotá',departamento:'Bogotá',direccion:'Consultorio de prueba'}]
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

  const base='http://localhost:3000';
  const shot=async name=>{await page.waitForTimeout(250);return page.screenshot({path:path.join(output,name+'.png'),fullPage:true});};
  const go=async url=>{await page.goto(base+url,{waitUntil:'networkidle'});await page.waitForTimeout(300)};
  const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const theme=async value=>{await page.evaluate(v=>localStorage.setItem('docsmart-theme',v),value);await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(250)};
  for(const width of [1440,834,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const t of ['light','dark','system']){
      await go('/login');await theme(t);await overflow();assert.equal(await page.getByRole('radio').count(),0);await shot('login-'+width+'-'+t);
      await go('/register?role=paciente');await overflow();await shot('register-'+width+'-'+t);
      await go('/patient/home');await overflow();await page.getByRole('heading',{name:'Tu próxima cita'}).waitFor();
      assert.equal(await page.getByRole('radio').count(),0);
      const bounds=await page.evaluate(()=>({nav:document.querySelector('header').getBoundingClientRect().bottom,h1:document.querySelector('h1').getBoundingClientRect().top}));assert.ok(bounds.h1>=bounds.nav,'navbar covers heading '+width);
      await shot('patient-'+width+'-'+t);
      await page.getByRole('button',{name:'Abrir Configuración',exact:true}).click();await page.getByRole('radio',{name:'Oscuro',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');assert.ok(await page.getByRole('radio',{name:'Oscuro',exact:true}).isChecked());assert.equal(await page.getByRole('radio').count(),3);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.getByRole('radio').count(),0);
    }
  }
  await page.setViewportSize({width:1440,height:1000});await go('/doctor/dashboard');await shot('doctor-light');await theme('dark');await shot('doctor-dark');
  await go('/');assert.equal(await page.getByRole('radio').count(),0);await shot('public-dark');
  for(const [flowTheme,flowWidth] of [['light',390],['dark',1440]]){
  docMode='error';otpMode='error';completeMode='error';loginMode='error';for(const key of Object.keys(requests))delete requests[key];await page.setViewportSize({width:flowWidth,height:1000});await go('/login');await theme(flowTheme);
  await go('/login');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('status').filter({hasText:'El correo'}).waitFor();
  await page.locator('input[name="correo"]').fill('fixture@example.com');await page.locator('input[name="contraseña"]').fill('ClavePrueba123');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByText('Credenciales incorrectas.',{exact:false}).waitFor();assert.equal(await page.locator('input[name="correo"]').inputValue(),'fixture@example.com');await shot('login-error');
  loginMode='success';await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:'OK',exact:true}).click();await page.waitForURL('**/patient/home');
  await go('/register?role=paciente');await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.getByRole('status').filter({hasText:'nombre'}).waitFor();
  for(const [name,value]of Object.entries({nombre:'Cuenta',apellido:'Prueba',numero_documento:'123456789',fecha_nacimiento:'1990-01-01'}))await page.locator(`input[name="${name}"]`).fill(value);
  await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.locator('#documento-frente').waitFor();
  const image={name:'fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGFAAAAAASUVORK5CYII=','base64')};
  await page.locator('#documento-frente').setInputFiles(image);await page.locator('#documento-reverso').setInputFiles(image);
  await page.evaluate(()=>{document.querySelector('form').requestSubmit();document.querySelector('form').requestSubmit()});await page.getByRole('status').filter({hasText:'Verificando tu documento'}).waitFor();await shot('document-pending');await page.getByText('Documento ilegible.',{exact:false}).waitFor();await shot('document-error');
  docMode='false';await page.getByRole('button',{name:'Verificar y continuar',exact:true}).click();await page.getByText('La identidad todavía no está verificada',{exact:false}).waitFor();assert.equal(await page.locator('input[name="telefono"]').count(),0);
  docMode='success';await page.getByRole('button',{name:'Verificar y continuar',exact:true}).click();await page.locator('input[name="telefono"]').waitFor();await shot('document-success');
  for(const [name,value]of Object.entries({telefono:'3001234567',estatura:'1.75',peso:'70'}))await page.locator(`input[name="${name}"]`).fill(value);
  await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.locator('input[name="correo"]').fill('fixture@example.com');await page.locator('input[name="contraseña"]').fill('ClavePrueba123');await page.locator('input[name="confirmar_contraseña"]').fill('ClavePrueba123');await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.locator('input[name="otp"]').fill('123456');
  await page.getByRole('button',{name:'Verificar y completar',exact:true}).click();await page.getByText('Código incorrecto.',{exact:false}).waitFor();assert.equal(await page.locator('input[name="otp"]').inputValue(),'123456');await shot('otp-error');
  await page.getByRole('button',{name:'Reenviar código',exact:true}).click();await page.getByText('Código reenviado.',{exact:false}).waitFor();assert.equal(await page.locator('input[name="otp"]').inputValue(),'123456');
  otpMode='false';await page.getByRole('button',{name:'Verificar y completar',exact:true}).click();await page.getByText('El correo todavía no está verificado',{exact:false}).waitFor();
  otpMode='success';await page.getByRole('button',{name:'Verificar y completar',exact:true}).click();await page.getByText('No se pudo completar.',{exact:false}).waitFor();const verifyCount=requests['/api/usuarios/registro/verificar-correo/'];
  completeMode='success';await page.getByRole('button',{name:'Completar registro',exact:true}).click();await page.getByRole('heading',{name:'¡Registro exitoso!'}).waitFor();assert.equal(requests['/api/usuarios/registro/verificar-correo/'],verifyCount);await shot('register-completed');await page.getByRole('button',{name:'Aceptar',exact:true}).click();await page.waitForURL('**/login');
  await go('/register?role=medico');
  for(const [name,value]of Object.entries({nombre:'Cuenta',apellido:'Prueba',cedula:'123456789',fecha_nacimiento:'1990-01-01'}))await page.locator(`input[name="${name}"]`).fill(value);
  await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.locator('input[name="telefono"]').fill('3001234567');await page.locator('input[name="direccion"]').fill('Consultorio de prueba');await page.locator('select[name="departamento_filtro"]').selectOption('1');await page.locator('select[name="id_ciudad"]').selectOption('1');await page.locator('select[name="id_especialidad"]').selectOption('1');await page.getByRole('button',{name:'Siguiente',exact:true}).click();
  await page.locator('input[name="correo"]').fill('doctor-fixture@example.com');await page.locator('input[name="contraseña"]').fill('ClavePrueba123');await page.locator('input[name="confirmar_contraseña"]').fill('ClavePrueba123');await page.locator('#hoja-vida').setInputFiles({name:'fixture.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 browser test fixture')});await page.getByRole('button',{name:'Registrarse',exact:true}).click();await page.getByRole('heading',{name:'¡Solicitud enviada!'}).waitFor();await shot('doctor-registration-completed');await page.getByRole('button',{name:'Aceptar',exact:true}).click();await page.waitForURL('**/login');
  assert.equal(requests['/api/medicos/registro/'],1);assert.equal(requests['/api/login/'],2);
  }
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});await go('/register?role=paciente');await theme('system');assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  assert.deepEqual(errors,[]);console.log('PASS: auth flow, document/OTP backend-confirmed success and false/error, completion retry, data retention, 320/390/834/1440, theme settings only, system OS, no navbar overlap, hydration. Isolated API fixtures.');await browser.close();
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1});
