from pathlib import Path
p=Path('frontend/components/forms/registerForm/RegisterForm.js');s=p.read_text(encoding='utf-8');s='\n'.join(line.replace('</p>','</motion.p>') if '<motion.p' in line else line for line in s.splitlines())+'\n';p.write_text(s,encoding='utf-8',newline='\n')
