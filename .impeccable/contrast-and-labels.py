from pathlib import Path
p=Path('frontend/src/app/variables.css');p.write_text(p.read_text(encoding='utf-8')+'\n:root{--control-border:#7b8390}:root[data-theme="dark"]{--control-border:#777f8e}\n',encoding='utf-8',newline='\n')
for f in ['frontend/components/ui/Input/Input.module.css','frontend/components/forms/registerForm/RegisterForm.module.css']:
 p=Path(f);p.write_text(p.read_text(encoding='utf-8')+'\n.input,.select{border-color:var(--control-border)}\n',encoding='utf-8',newline='\n')
p=Path('frontend/components/forms/registerForm/UseRegister.js');s=p.read_text(encoding='utf-8').replace('        report("pending",message)','        setErrors({})\n        report("pending",message)');p.write_text(s,encoding='utf-8',newline='\n')
p=Path('frontend/components/forms/registerForm/RegisterForm.js');s=p.read_text(encoding='utf-8');import re
labels={'nombre':'Nombre','apellido':'Apellido','numero_documento':'Número de documento','cedula':'Cédula','fecha_nacimiento':'Fecha de nacimiento','telefono':'Teléfono','estatura':'Estatura (metros)','peso':'Peso (kg)','correo':'Correo electrónico','contraseña':'Contraseña','confirmar_contraseña':'Confirmar contraseña','direccion':'Dirección','otp':'Código de verificación'}
for name,label in labels.items():
 s=re.sub(r'(<Input[^\n]*?name="'+name+r'"[^\n]*?/>)',lambda m:f'<label htmlFor="register-{name}" className={{styles.fieldLabel}}>{label}</label>\n                                '+m[1].replace('<Input','<Input id="register-'+name+'"',1),s)
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('frontend/components/forms/registerForm/RegisterForm.module.css');p.write_text(p.read_text(encoding='utf-8')+'\n.fieldLabel{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:-6px}.select:focus,.input:focus{border-color:var(--focus)}\n',encoding='utf-8',newline='\n')
p=Path('frontend/src/app/(auth)/login/page.js');s=p.read_text(encoding='utf-8').replace('Inicia sesión:','Inicia sesión').replace('¿No tienes una cuenta?, registrate aquí','Crear una cuenta');p.write_text(s,encoding='utf-8',newline='\n')
# A separate computed contrast audit uses the same isolated backend fixtures.
s=Path('frontend/scripts/verify-design-corrections.cjs').read_text(encoding='utf-8');s=s[:s.index("  const base='http")]
s+='''
  const failures=[];
  for(const t of ['light','dark'])for(const url of ['/login','/register?role=paciente','/register?role=medico','/patient/home','/doctor/home','/doctor/dashboard']){
    await page.goto('http://localhost:3000'+url,{waitUntil:'networkidle'});await page.evaluate(v=>localStorage.setItem('docsmart-theme',v),t);await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(350);
    if(url.includes('dashboard'))await page.getByRole('button',{name:'Abrir Configuración',exact:true}).click();
    const bad=await page.evaluate(()=>{
      const rgb=s=>{const n=s.match(/[\\d.]+/g)?.map(Number);return n&&n.length>=3?[...n.slice(0,3),n[3]??1]:[0,0,0,0]};
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
'''
Path('frontend/scripts/verify-contrast.cjs').write_text(s,encoding='utf-8',newline='\n')
