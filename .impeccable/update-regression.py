from pathlib import Path
import re
p=Path('frontend/scripts/verify-home.cjs');s=p.read_text(encoding='utf-8')
s=re.sub(r"await page.getByRole\('radio', \{\s*name: '(Oscuro|Claro|Sistema)',\s*exact: true\s*\}\)\.(?:first|last)\(\)\.check\(\);",lambda m:"await page.evaluate(value => {localStorage.setItem('docsmart-theme', value);window.dispatchEvent(new CustomEvent('docsmart:theme',{detail:value}));}, '"+{'Oscuro':'dark','Claro':'light','Sistema':'system'}[m[1]]+"');",s)
p.write_text(s,encoding='utf-8',newline='\n')
p=Path('DESIGN.md');s=p.read_text(encoding='utf-8').replace('El menú móvil muestra controles de tema dentro del panel.','El selector de tema se presenta exclusivamente en Configuración; el navbar y el menú móvil no lo incluyen.');s+='\nLas superficies azules usan `--blue-card-*` y `--blue-action-*` para mantener texto claro independientemente del tema global. Los controles usan `--control-border` para límites legibles. Los formularios comparten `VerificationStatus`: estados pendientes, error y éxito confirmados por API, anunciados con aria-live. El registro conserva los valores y bloquea envíos simultáneos.\n';p.write_text(s,encoding='utf-8',newline='\n')
