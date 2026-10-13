const {chromium}=require(require('path').join(require('os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const assert=require('node:assert/strict');
const base=process.env.DOCSMART_BASE_URL || 'http://localhost:3101';
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const results=[];
 for(const role of ['paciente','doctor']) for(const mobile of [false,true]) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:mobile?'reduce':'no-preference'});
  await context.addInitScript(()=>{
   window.__recognitionStarts=0;window.__recognitionStops=0;window.__audioPlays=0;
   window.SpeechRecognition=class {start(){window.__recognitionStarts++;window.__recognition=this;setTimeout(()=>this.onstart?.(),0);}abort(){window.__recognitionStops++;setTimeout(()=>this.onend?.(),0);}};
   HTMLMediaElement.prototype.play=function(){window.__audioPlays++;setTimeout(()=>this.onplaying?.(),0);return Promise.resolve();};
   window.WebSocket=class {
    static OPEN=1;
    constructor(url){this.url=String(url);this.readyState=1;if(this.url.includes('/ws/chatbot/'))window.__chatSocket=this;setTimeout(()=>this.onopen?.(),0);}
    close(){this.readyState=3;this.onclose?.();}
    send(raw){const data=JSON.parse(raw);if(!this.url.includes('/ws/chatbot/'))return;
     window.__sentRequests=(window.__sentRequests||[]).concat(data);
     const text=`Respuesta por WebSocket: ${data.mensaje}`;
     setTimeout(()=>{this.onmessage?.({data:JSON.stringify({tipo:'texto',contenido:text})});this.onmessage?.({data:JSON.stringify({tipo:'fin',respuesta:text})});},20);
    }
   };
  });
  const counts={login:0,identityGet:0,identityPost:0,httpChat:0,voice:0};
  const actor={id:role==='paciente'?987:988,nombre:'Ana',apellido:'Prueba',rol:role,estado_validacion:'aprobado',especialidad:'General'};
  await context.route('**/api/**',route=>{
   const request=route.request(),path=new URL(request.url()).pathname;
   const ok=data=>route.fulfill({status:200,json:{ok:true,data}});
   if(path.endsWith('/csrf/'))return ok({csrf_token:'fixture'});
   if(path.endsWith('/login/')){counts.login++;return ok(actor);}
   if(path.endsWith('/perfil/'))return ok(actor);
   if(path.endsWith('/chatbot/identidad/')){
    if(request.method()!=='GET'){counts.identityPost++;return route.fulfill({status:405,json:{detail:'Method not allowed'}});}
    counts.identityGet++;return ok({...actor,rol:role==='doctor'?'medico':'paciente',saludo:'Hola, Ana Prueba. Soy Bymax, tu asistente de salud.',diagnostico_autorizado:false});
   }
   if(path.endsWith('/chatbot/chats/'))return ok(request.method()==='GET'?[{id:1,titulo:'Consulta de prueba'}]:{id:2,titulo:'Nueva conversación'});
   if(path.includes('/chatbot/mensajes/'))return ok([]);
   if(path.endsWith('/responder/')){counts.httpChat++;return ok({respuesta:'Respuesta alternativa de Bymax.',resultado:null});}
   if(path.endsWith('/chatbot/voz/')){counts.voice++;return route.fulfill({status:200,contentType:'audio/wav',body:Buffer.from('UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==','base64')});}
   if(path.endsWith('/dashboard/inicio/paciente/')||path.endsWith('/medicos/dashboard/inicio/'))return ok({usuario:'Ana Prueba',estadisticas:{},proximas_citas:[],citas:[],notificaciones:[]});
   if(path.includes('notificaciones'))return ok([]);
   if(path.includes('citas/resumen/'))return ok({pendientes:0,confirmadas:0,completadas:0,canceladas:0});
   if(path.includes('citas'))return ok({data:[],paginacion:{current_page:1,total_pages:1,count:0}});
   if(path.includes('/catalogos/')||path.includes('/especialidades/'))return ok([]);
   return ok({});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(/hydration|hydrated|did not match/i.test(message.text()))errors.push(message.text());});
  await page.goto(base+'/login',{waitUntil:'domcontentloaded'});
  
  await page.waitForFunction(()=>Object.keys(document.querySelector('input[name=correo]')||{}).some(key=>key.startsWith('__reactProps$')));
  await page.locator('input[name=correo]').fill('fixture@example.com');
  await page.locator('input[name=contraseña]').fill('PruebaSegura123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.locator('.swal2-confirm').click();
  const prefix=role==='paciente'?'patient':'doctor';await page.waitForURL(`**/${prefix}/home`);
  const launcher=page.getByRole('button',{name:/Abrir Bymax/});await launcher.waitFor();
  assert.equal(counts.login,1);assert.equal(await page.evaluate(()=>window.__recognitionStarts),0);
  await launcher.click();const dialog=page.getByRole('dialog',{name:'Chat con Bymax'});await dialog.waitFor();
  await dialog.getByText('Hola, Ana Prueba. Soy Bymax, tu asistente de salud.',{exact:true}).first().waitFor();
  const input=dialog.getByRole('textbox',{name:'Mensaje para Bymax'});
  await input.fill('Consulta escrita de prueba');await dialog.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
  await dialog.getByText('Respuesta por WebSocket: Consulta escrita de prueba',{exact:true}).waitFor();
  assert.equal(counts.identityPost,0);
  await page.evaluate(()=>window.__chatSocket.close());
  await input.fill('Consulta por conexión alternativa');await dialog.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
  await dialog.getByText('Respuesta alternativa de Bymax.',{exact:true}).waitFor();assert.equal(counts.httpChat,1);
  await dialog.getByRole('button',{name:'Minimizar chat'}).click();
  await page.getByRole('button',{name:'Abrir Configuración',exact:true}).click();
  await page.getByRole('button',{name:'Activar voz',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Esperando «Bymax»'}).waitFor();
  assert.equal(await page.evaluate(()=>window.__recognitionStarts),1);
  await page.getByRole('button',{name:'Cerrar ventana',exact:true}).click();
  await launcher.click();await dialog.waitFor();
  await dialog.getByRole('button',{name:'Configurar voz',exact:true}).click();
  await dialog.getByRole('button',{name:'Probar voz',exact:true}).click();
  await page.waitForFunction(()=>window.__audioPlays>0);
  assert.ok(counts.voice>0);assert.ok(await page.evaluate(()=>window.__recognitionStops>0));
  await page.getByRole('button',{name:'Detener',exact:true}).click();
  await page.getByRole('button',{name:'Cerrar configuración de voz'}).click();
  await dialog.getByRole('button',{name:'Minimizar chat'}).click();
  if(mobile)await page.getByRole('button',{name:'Abrir menú',exact:true}).click();
  await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('link',{name:'Mis citas',exact:true}).click();await page.waitForURL(`**/${prefix}/my-appointments`);
  await page.reload();await launcher.waitFor();await launcher.click();await dialog.waitFor();
  assert.equal(counts.identityPost,0);assert.ok(counts.identityGet>=1);
  assert.deepEqual(errors,[]);results.push({role,mobile,counts,errors});await context.close();
 }
 await browser.close();console.log(JSON.stringify(results,null,2));
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;});





