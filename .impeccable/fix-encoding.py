from pathlib import Path
for p in Path('frontend').rglob('*'):
 if 'node_modules' in p.parts or '.next' in p.parts or not p.is_file() or p.suffix not in ['.js','.css','.cjs']:continue
 s=p.read_text(encoding='utf-8'); t=s
 for ch in 'ñáéíóúÁÉÍÓÚÑü¿¡·…—–→':
  try:t=t.replace(ch.encode('utf-8').decode('cp1252'),ch)
  except UnicodeError:pass
 if t!=s:p.write_text(t,encoding='utf-8',newline='\n');print(p)
