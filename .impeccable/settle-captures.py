from pathlib import Path
p=Path('frontend/scripts/verify-design-corrections.cjs');s=p.read_text(encoding='utf-8').replace("const shot=async name=>page.screenshot", "const shot=async name=>{await page.waitForTimeout(250);return page.screenshot").replace("name+'.png'),fullPage:true});", "name+'.png'),fullPage:true});};");p.write_text(s,encoding='utf-8',newline='\n')
# Only capture a settled success modal, using isolated login response.
s=s[:s.index("  const base='http")].replace("path.resolve(__dirname, '../../.impeccable/corrections')","path.resolve(process.cwd(), '.impeccable/corrections')")
s+='''
  loginMode='success';await page.goto('http://localhost:3000/login',{waitUntil:'networkidle'});await page.evaluate(()=>localStorage.setItem('docsmart-theme','dark'));await page.reload({waitUntil:'networkidle'});await page.locator('input[name="correo"]').fill('fixture@example.com');await page.locator('input[name="contraseña"]').fill('ClavePrueba123');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:'OK',exact:true}).waitFor();await page.waitForTimeout(600);console.log(await page.locator('.swal2-popup').evaluate(el=>({background:getComputedStyle(el).backgroundColor,opacity:getComputedStyle(el).opacity,rect:el.getBoundingClientRect().toJSON()})));await page.screenshot({path:path.join(output,'auth-confirmation-settled.png'),fullPage:true});await browser.close();
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1});
'''
Path('.impeccable/capture-confirmation.cjs').write_text(s,encoding='utf-8',newline='\n')
