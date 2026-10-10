from pathlib import Path
p=Path('frontend/components/ui/Button/Button.module.css');p.write_text(p.read_text()+'''\n.btn{transition:transform var(--motion-fast) var(--motion-ease),background-color var(--motion-fast),box-shadow var(--motion-fast);font-weight:600}.btn:hover{opacity:1}.btn:active{transform:scale(.98)}.secondary,.secundary{background:var(--surface-muted);border:1px solid var(--border);color:var(--text-primary)}.btn:disabled{opacity:1;color:var(--text-secondary);background:var(--surface-muted);border:1px solid var(--border);cursor:not-allowed;transform:none;box-shadow:none}.btn.loading{color:var(--text-secondary)}.btn.loading::after{display:none}.btn.loading .spinner{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .7s linear infinite}.btn:focus-visible{outline:3px solid var(--focus);outline-offset:3px}\n@media(hover:hover) and (pointer:fine){.primary:not(:disabled):hover{background:#2445b4;box-shadow:0 5px 14px #1733a425}}\n''',newline='\n')
p=Path('frontend/components/ui/Modal/Modal.module.css');p.write_text(p.read_text()+'''\n.default{color:var(--on-accent)}.default .containerTitle p,.default .container svg{color:var(--on-accent)}.white .containerTitle p,.white .container svg{color:var(--text-secondary)}.yellow .titulo,.yellow .containerTitle p,.yellow .cerrar,.yellow .container svg{color:#452600}.white .cerrar:hover{background:var(--surface-muted);color:var(--text-primary)}\n''',newline='\n')
for f in ['frontend/components/doctor/Home/Notifications/Notifications.module.css','frontend/components/doctor/Home/AppointmentsList/AppointmentsList.module.css']:
 p=Path(f);p.write_text(p.read_text().replace('#22c55e','#17664e').replace('#16a34a','#125a44'),newline='\n')
p=Path('frontend/components/forms/registerForm/RegisterForm.js');s=p.read_text().replace('motion, useReducedMotion','AnimatePresence, motion, useReducedMotion').replace('<motion.div key={step}', '<AnimatePresence initial={false} mode="wait"><motion.div key={step}').replace('initial={{opacity:1}} animate={{opacity:1}}','initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}').replace('</motion.div>','</motion.div></AnimatePresence>')
s=s.replace('<p id="register-', '<motion.p key={feedback.revision} animate={{x:reduced?0:[0,-3,3,0]}} transition={{duration:.18}} id="register-')
import re
s=re.sub(r'(<motion.p[^>]+>\{errors\.\w+\})</p>',r'\1</motion.p>',s)
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('frontend/src/app/globals.css');p.write_text(p.read_text()+'''\n@media(prefers-reduced-motion:reduce){[class*="mainLogin"]>[class*="container"],[class*="mainRegister"]>[class*="container"]{transform:none!important}}\n''',newline='\n')
# Browser test uses explicit backend fixtures, never registers real accounts.
s=Path('frontend/scripts/verify-home.cjs').read_text();s=s[:s.index('  const go = async')]
s=s.replace("'../../.impeccable/review'","'../../.impeccable/corrections'")
s=s.replace('  let metrics',"  let docMode='error', otpMode='error', completeMode='error', loginMode='error';\n  const requests={};\n  let metrics")
s=s.replace("    if (url.pathname.endsWith('/public/metrics/'))",'''    requests[url.pathname]=(requests[url.pathname]||0)+1;
    const fail=mensaje=>route.fulfill({status:400,json:{ok:false,mensaje}});
    if(url.pathname.endsWith('/login/')){await new Promise(r=>setTimeout(r,200));return loginMode==='error'?fail('Credenciales incorrectas. Revisa correo y contraseña.'):json({ok:true,message:'Sesión iniciada',data:{rol:'paciente',nombre:'Cuenta',apellido:'de prueba'}})}
    if(url.pathname.endsWith('/usuarios/registro/'))return json({ok:true,data:{proceso_id:'browser-fixture'}});
    if(url.pathname.endsWith('/registro/documento/verificar/')){await new Promise(r=>setTimeout(r,200));return docMode==='error'?fail('Documento ilegible. Carga una imagen más clara y reintenta.'):json({ok:true,data:{documento_verificado:docMode==='success'}})}
    if(url.pathname.endsWith('/registro/verificar-correo/')){await new Promise(r=>setTimeout(r,200));return otpMode==='error'?fail('Código incorrecto. Revisa el código enviado a tu correo.'):json({ok:true,data:{correo_verificado:otpMode==='success'}})}
    if(url.pathname.endsWith('/registro/completar/'))return completeMode==='error'?fail('No se pudo completar. Reintenta.'):json({ok:true,data:{registro_completo:true}});
    if(url.pathname.includes('/usuarios/registro/'))return json({ok:true,data:{}});
    if (url.pathname.endsWith('/public/metrics/'))''')
s=s.replace('        proximas_citas: []\n      }\n    });\n    if (url.pathname.endsWith(\'/csrf/\'))', '''        proximas_citas: [{id:7,estado:'confirmada',fecha_programada:'2027-10-15T15:00:00Z',medico:'Profesional de prueba',especialidad:'Medicina general',ciudad:'Bogotá',departamento:'Bogotá',direccion:'Consultorio de prueba'}]
      }
    });
    if (url.pathname.endsWith('/csrf/'))''')
s+='''
  const base='http://localhost:3000';
  const shot=async name=>page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
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
      await page.getByRole('button',{name:'Abrir Configuración',exact:true}).click();await page.getByRole('radio',{name:'Oscuro',exact:true}).check();assert.equal(await page.getByRole('radio').count(),3);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.getByRole('radio').count(),0);
    }
  }
  await page.setViewportSize({width:1440,height:1000});await go('/doctor/dashboard');await shot('doctor-light');await theme('dark');await shot('doctor-dark');
  await go('/');assert.equal(await page.getByRole('radio').count(),0);await shot('public-dark');
  await go('/login');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('status').filter({hasText:'El correo'}).waitFor();
  await page.locator('input[name="correo"]').fill('fixture@example.com');await page.locator('input[name="contraseña"]').fill('ClavePrueba123');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByText('Credenciales incorrectas.',{exact:false}).waitFor();assert.equal(await page.locator('input[name="correo"]').inputValue(),'fixture@example.com');await shot('login-error');
  loginMode='success';await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:'OK',exact:true}).click();await page.waitForURL('**/patient/home');
  await go('/register?role=paciente');await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.getByRole('status').filter({hasText:'nombre'}).waitFor();
  for(const [name,value]of Object.entries({nombre:'Cuenta',apellido:'Prueba',numero_documento:'123456789',fecha_nacimiento:'1990-01-01'}))await page.locator(`input[name="${name}"]`).fill(value);
  await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.locator('#documento-frente').waitFor();
  const image={name:'fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGFAAAAAASUVORK5CYII=','base64')};
  await page.locator('#documento-frente').setInputFiles(image);await page.locator('#documento-reverso').setInputFiles(image);
  await page.getByRole('button',{name:'Verificar y continuar',exact:true}).click();await page.getByText('Documento ilegible.',{exact:false}).waitFor();await shot('document-error');
  docMode='false';await page.getByRole('button',{name:'Verificar y continuar',exact:true}).click();await page.getByText('La identidad todavía no está verificada',{exact:false}).waitFor();assert.equal(await page.locator('input[name="telefono"]').count(),0);
  docMode='success';await page.getByRole('button',{name:'Verificar y continuar',exact:true}).click();await page.locator('input[name="telefono"]').waitFor();await shot('document-success');
  for(const [name,value]of Object.entries({telefono:'3001234567',estatura:'1.75',peso:'70'}))await page.locator(`input[name="${name}"]`).fill(value);
  await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.locator('input[name="correo"]').fill('fixture@example.com');await page.locator('input[name="contraseña"]').fill('ClavePrueba123');await page.locator('input[name="confirmar_contraseña"]').fill('ClavePrueba123');await page.getByRole('button',{name:'Siguiente',exact:true}).click();await page.locator('input[name="otp"]').fill('123456');
  await page.getByRole('button',{name:'Verificar y completar',exact:true}).click();await page.getByText('Código incorrecto.',{exact:false}).waitFor();assert.equal(await page.locator('input[name="otp"]').inputValue(),'123456');await shot('otp-error');
  otpMode='false';await page.getByRole('button',{name:'Verificar y completar',exact:true}).click();await page.getByText('El correo todavía no está verificado',{exact:false}).waitFor();
  otpMode='success';await page.getByRole('button',{name:'Verificar y completar',exact:true}).click();await page.getByText('No se pudo completar.',{exact:false}).waitFor();const verifyCount=requests['/api/usuarios/registro/verificar-correo/'];
  completeMode='success';await page.getByRole('button',{name:'Completar registro',exact:true}).click();await page.getByRole('heading',{name:'¡Registro exitoso!'}).waitFor();assert.equal(requests['/api/usuarios/registro/verificar-correo/'],verifyCount);await shot('register-completed');await page.getByRole('button',{name:'Aceptar',exact:true}).click();await page.waitForURL('**/login');
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});await go('/register?role=paciente');await theme('system');assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');await page.emulateMedia({colorScheme:'light'});assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
  assert.deepEqual(errors,[]);console.log('PASS: auth flow, document/OTP backend-confirmed success and false/error, completion retry, data retention, 320/390/834/1440, theme settings only, system OS, no navbar overlap, hydration. Isolated API fixtures.');await browser.close();
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1});
'''
Path('frontend/scripts/verify-design-corrections.cjs').write_text(s,encoding='utf-8',newline='\n')
