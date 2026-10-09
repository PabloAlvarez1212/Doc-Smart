from pathlib import Path
p=Path('frontend/components/forms/registerForm/RegisterForm.js');s=p.read_text(encoding='utf-8').replace('<CheckCircle2 size={17} />','<FileText size={17} aria-label="Imagen seleccionada, pendiente de verificación" />');p.write_text(s,encoding='utf-8',newline='\n')
p=Path('frontend/components/forms/registerForm/RegisterForm.module.css');p.write_text(p.read_text(encoding='utf-8')+'\n.fileNameRow svg{color:var(--text-secondary)}\n',encoding='utf-8',newline='\n')
