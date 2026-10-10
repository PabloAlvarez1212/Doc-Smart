let playwright;
try { playwright=require('playwright'); }
catch { playwright=require(process.env.DOCSMART_PLAYWRIGHT_PATH || require('path').join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const {chromium}=playwright;
const baseURL=process.env.DOCSMART_BASE_URL || 'http://localhost:3000';
const fs=require('fs/promises'), assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.DOCSMART_BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 await fs.mkdir('.impeccable/registration',{recursive:true});
 const issues=[];
 async function contrast(page) {
  const failures=await page.evaluate(()=>{
   function rgb(value){const v=value.match(/[\d.]+/g);return v&&v.length>=3?v.map(Number):null}
   function luminance(v){return v.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0)}
   const failed=[];
   for(const el of document.querySelectorAll('h1,h2,h3,p,label,li,small,input,select,a,button')){
    if(!el.getBoundingClientRect().height||!el.textContent.trim()&&el.tagName!=='INPUT')continue;
    const st=getComputedStyle(el);const fg=rgb(st.color);if(!fg)continue;
    let parent=el,bg;
    while(parent){const v=rgb(getComputedStyle(parent).backgroundColor);if(v&&(v.length===3||v[3]===1)){bg=v;break}parent=parent.parentElement}
    if(!bg)bg=rgb(getComputedStyle(document.documentElement).getPropertyValue('--background'));
    if(!bg)continue;
    const a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const large=parseFloat(st.fontSize)>=24 || (parseFloat(st.fontSize)>=18.66&&parseInt(st.fontWeight)>=700);
    if(ratio<(large?3:4.5))failed.push({text:el.textContent.slice(0,60),ratio:ratio.toFixed(2)});
   }
   return failed;
  });
  assert.deepEqual(failures,[], 'WCAG AA text contrast');
 }

 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1v8AAAAASUVORK5CYII=','base64');
 for(const mode of ['light','dark','system']) for(const mobile of [false,true]) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},colorScheme:mode==='light'?'light':'dark',reducedMotion:mobile?'reduce':'no-preference'});
  await context.addInitScript(theme=>localStorage.setItem('docsmart-theme',theme),mode);
  let docFail=true,otpFail=true,completeFail=true;
  const counts={};
  await context.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   counts[path]=(counts[path]||0)+1;
   const ok=data=>route.fulfill({status:200,json:{ok:true,data}});
   const fail=(errores,data)=>route.fulfill({status:400,json:{ok:false,mensaje:'Revisa los campos indicados.',errores,data}});
   if(path.endsWith('/csrf/'))return ok({csrf_token:'fixture'});
   if(path.endsWith('/especialidades/'))return ok([{id:1,nombre:'Medicina general'}]);
   if(path.endsWith('/departamentos/'))return ok([{id:1,nombre:'Bogotá'}]);
   if(path.endsWith('/ciudades/'))return ok([{id_ciudad:1,nombre_ciudad:'Bogotá'}]);
   if(path.endsWith('/registro/'))return ok({proceso_id:'fixture'});
   if(path.endsWith('/documento/verificar/')) {await new Promise(r=>setTimeout(r,180));return docFail?fail({nombre:['El nombre no coincide con el documento']},{comparaciones:{nombre:false,apellido:true,numero_documento:true,fecha_nacimiento:true}}):ok({documento_verificado:true,comparaciones:{nombre:true,apellido:true,numero_documento:true,fecha_nacimiento:true}})}
   if(path.endsWith('/datos-adicionales/')||path.endsWith('/datos-profesionales/'))return ok({datos_guardados:true});
   if(path.endsWith('/credenciales/'))return ok({correo_configurado:true});
   if(path.endsWith('/verificar-correo/')) {await new Promise(r=>setTimeout(r,180));return otpFail?fail({codigo:['Código incorrecto. Revisa tu correo e intenta de nuevo.']}):ok({correo_verificado:true})}
   if(path.endsWith('/completar/'))return completeFail?fail({general:['No se pudo completar. Reintenta.']}):ok({estado_validacion:'pendiente'});
   return ok({});
  });
  const page=await context.newPage();
  page.on('pageerror',e=>issues.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error'&&!msg.text().includes('400')&&!msg.text().includes('Failed to load resource'))issues.push(msg.text())});
  await page.goto(`${baseURL}/rol`);
  await page.getByRole('heading',{name:'Tu espacio en DocSmart.'}).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'),mode==='light'?'light':'dark');
  await contrast(page);
  await page.screenshot({path:`.impeccable/registration/roles-${mode}-${mobile?'mobile':'desktop'}.png`,fullPage:true});
  await page.keyboard.press('Tab');
  assert.ok(await page.locator(':focus').count());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const role of ['paciente','medico']) {
   docFail=true;otpFail=true;completeFail=true;
   await page.goto(`${baseURL}/register?role=${role}`);
   await page.getByLabel('Nombre',{exact:true}).fill('Ana');
   await page.getByLabel('Apellido',{exact:true}).fill('Perez');
   await page.getByLabel('Número de documento',{exact:true}).fill('1234567890');
   await page.getByLabel('Fecha de nacimiento',{exact:true}).fill('1990-05-10');
   await page.getByRole('button',{name:'Continuar',exact:true}).click();
   await page.getByLabel('Frente del documento',{exact:true}).setInputFiles({name:'documento.png',mimeType:'image/png',buffer:png});
   await page.getByLabel('Reverso del documento',{exact:true}).setInputFiles({name:'documento.png',mimeType:'image/png',buffer:png});
   await page.getByRole('button',{name:'Verificar documento',exact:true}).click();
   await page.getByText('No coincide',{exact:true}).waitFor();
   docFail=false;
   await page.getByRole('button',{name:'Verificar documento',exact:true}).click();
   await page.getByLabel('Teléfono celular',{exact:true}).fill('3001234567');
   if(role==='paciente'){
    await page.getByLabel('Estatura (m)',{exact:true}).fill('1.7');await page.getByLabel('Peso (kg)',{exact:true}).fill('60');
    await page.getByLabel('Género',{exact:true}).selectOption('F');await page.getByLabel('Tipo de sangre',{exact:true}).selectOption('O+');
   }else{
    await page.getByLabel('Dirección',{exact:true}).fill('Calle 10 # 20-30');await page.getByLabel('Departamento',{exact:true}).selectOption('1');
    await page.getByLabel('Ciudad',{exact:true}).selectOption('1');await page.getByLabel('Especialidad',{exact:true}).selectOption('1');
    await page.getByLabel('Hoja de vida profesional',{exact:true}).setInputFiles({name:'hoja.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n/Type /Catalog\n%%EOF')});
   }
   await contrast(page);
   await page.screenshot({path:`.impeccable/registration/${role}-${mode}-${mobile?'mobile':'desktop'}-step3.png`,fullPage:true});
   await page.getByRole('button',{name:'Continuar',exact:true}).click();
   await page.getByLabel('Correo electrónico',{exact:true}).fill('ana@example.com');
   await page.getByLabel('Contraseña',{exact:true}).fill('Segura123!');await page.getByLabel('Confirmar contraseña',{exact:true}).fill('Segura123!');
   await page.getByRole('button',{name:'Enviar código',exact:true}).click();
   await page.getByLabel('Código de verificación',{exact:true}).fill('000000');await page.getByRole('button',{name:'Verificar y completar',exact:true}).click();
   await page.locator('#register-codigo-error').waitFor();assert.equal(await page.getByLabel('Código de verificación',{exact:true}).inputValue(),'000000');
   await page.getByRole('button',{name:'Reenviar código',exact:true}).click();
   await page.getByText('Código reenviado.',{exact:false}).waitFor();
   otpFail=false;await page.getByLabel('Código de verificación',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verificar y completar',exact:true}).click();
   await page.getByRole('button',{name:'Completar registro',exact:true}).waitFor();
   completeFail=false;await page.getByRole('button',{name:'Completar registro',exact:true}).click();
   await page.getByRole('button',{name:'Aceptar',exact:true}).waitFor();
   if(role==='medico')await page.getByText(/Tu solicitud profesional está pendiente de aprobación/).waitFor();
   await page.getByRole('button',{name:'Aceptar',exact:true}).click();
   await page.waitForURL('**/login');
  }
  await context.close();
 }
 assert.deepEqual(issues,[]);console.log('PASS: patient and doctor complete fixtures, OCR/OTP errors + retries, role cards, light/dark/system, desktop/mobile, reduced motion, WCAG AA computed text contrast, no hydration/runtime errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
