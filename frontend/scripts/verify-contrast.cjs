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
    if(url.pathname.endsWith('/login/')){await new Promise(r=>setTimeout(r,200));return loginMode==='error'?fail('Credenciales incorrectas. Revisa correo y contraseña.'):json({ok:true,message:'Sesión iniciada',data:{rol:'paciente',nombre:'Cuenta',apellido:'de prueba'}})}
    if(url.pathname.endsWith('/perfil/admin/'))return json({ok:true,data:{id:44,rol:'admin',nombre:'Cuenta de prueba'}});
    if(url.pathname.endsWith('/usuarios/registro/'))return json({ok:true,data:{proceso_id:'browser-fixture'}});
    if(url.pathname.endsWith('/registro/documento/verificar/')){await new Promise(r=>setTimeout(r,200));return docMode==='error'?fail('Documento ilegible. Carga una imagen más clara y reintenta.'):json({ok:true,data:{documento_verificado:docMode==='success'}})}
    if(url.pathname.endsWith('/registro/verificar-correo/')){await new Promise(r=>setTimeout(r,200));return otpMode==='error'?fail('Código incorrecto. Revisa el código enviado a tu correo.'):json({ok:true,data:{correo_verificado:otpMode==='success'}})}
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


  const failures=[];
  for(const t of ['light','dark'])for(const url of ['/login','/register?role=paciente','/register?role=medico','/patient/home','/doctor/home','/doctor/dashboard','/admin/dashboard','/']){
    await page.goto('http://localhost:3000'+url,{waitUntil:'networkidle'});await page.evaluate(v=>localStorage.setItem('docsmart-theme',v),t);await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(350);
    if(url==='/doctor/dashboard')await page.getByRole('button',{name:'Abrir Configuración',exact:true}).click();
    const bad=await page.evaluate(()=>{
      const rgb=s=>{const n=s.match(/[\d.]+/g)?.map(Number);return n&&n.length>=3?[...n.slice(0,3),n[3]??1]:[0,0,0,0]};
      const blend=(f,b)=>[0,1,2].map(i=>f[i]*f[3]+b[i]*(1-f[3])).concat(1);
      const lum=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
      const bad=[];
      for(const el of document.querySelectorAll('h1,h2,h3,p,span,a,button,label,small,strong,input,select')){
        if(el.closest('nextjs-portal')||!el.getBoundingClientRect().width||getComputedStyle(el).visibility==='hidden'||Number(getComputedStyle(el).opacity)<.9)continue;
        const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()||(el.tagName==='INPUT'?el.placeholder:'');if(!text)continue;
        const chain=[];for(let p=el;p;p=p.parentElement)chain.push(p);let bg=[255,255,255,1];for(const a of chain.reverse())bg=blend(rgb(getComputedStyle(a).backgroundColor),bg);
        const st=getComputedStyle(el),fg=rgb(el.tagName==='INPUT'&&!el.value?getComputedStyle(el,'::placeholder').color:st.color);const l1=lum(blend(fg,bg)),l2=lum(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);const large=parseFloat(st.fontSize)>=24||(parseFloat(st.fontSize)>=18.66&&Number(st.fontWeight)>=700);if(ratio<(large?3:4.5))bad.push({text:text.slice(0,70),ratio:+ratio.toFixed(2),fg:st.color,bg,cls:el.className});
      }return bad;
    });failures.push(...bad.map(f=>({theme:t,url,...f})));await page.screenshot({path:path.join(output,'audit-'+url.split('/')[1].split('?')[0]+'-'+t+'.png'),fullPage:true});
  }
  await fs.writeFile(path.join(output,'contrast-report.json'),JSON.stringify(failures,null,2));console.log(JSON.stringify(failures,null,2));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log('PASS: computed WCAG AA text contrast on affected screens in light and dark');await browser.close();
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1});
