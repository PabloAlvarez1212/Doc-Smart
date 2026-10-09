from pathlib import Path
p=Path('frontend/components/forms/registerForm/RegisterForm.module.css');s=p.read_text(encoding='utf-8')+'\n.fileInput:disabled ~ .uploadSurface label{opacity:1;color:var(--text-secondary);background:var(--surface-muted);cursor:not-allowed}\n';p.write_text(s,encoding='utf-8',newline='\n')
p=Path('frontend/components/ui/SettingsComponent/SettingsComponent.module.css');s=p.read_text(encoding='utf-8')+'\n.textContainer>button:disabled{opacity:1;color:var(--text-secondary);background:var(--surface-muted)}\n';p.write_text(s,encoding='utf-8',newline='\n')
s=Path('.impeccable/capture-confirmation.cjs').read_text(encoding='utf-8');s=s[:s.index("  loginMode='success';")]
s+='''
  for(const width of [320,1440]){
    await page.setViewportSize({width,height:1000});await page.goto('http://localhost:3000/patient/home',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Abrir Configuración',exact:true}).click();
    for(const [label,value] of [['Claro','light'],['Oscuro','dark'],['Sistema','system']]){
      await page.getByRole('radio',{name:label,exact:true}).click();await page.waitForFunction(v=>localStorage.getItem('docsmart-theme')===v,value);await page.waitForTimeout(250);assert.ok(await page.getByRole('radio',{name:label,exact:true}).isChecked());await page.screenshot({path:path.join(output,'settings-'+width+'-'+value+'.png'),fullPage:true});
    }
    await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>localStorage.getItem('docsmart-theme')),'system');assert.equal(await page.getByRole('radio').count(),0);
    await page.evaluate(()=>window.scrollTo(0,28));await page.waitForTimeout(300);const overlap=await page.evaluate(()=>document.querySelector('h1').getBoundingClientRect().top<document.querySelector('header').getBoundingClientRect().bottom);assert.equal(overlap,false,'compact navbar overlap');
  }
  assert.deepEqual(errors,[]);console.log('PASS: all settings options, persistence, closed controls absent, compact navbar at 320 and 1440');await browser.close();
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1});
'''
Path('.impeccable/verify-settings.cjs').write_text(s,encoding='utf-8',newline='\n')
