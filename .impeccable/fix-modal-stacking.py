from pathlib import Path
p=Path('frontend/components/bymax/BymaxAssistant.module.css');s=p.read_text(encoding='utf-8')+'\n/* Account dialogs must stay above the floating assistant. */\n.launcher{z-index:1200}\n';p.write_text(s,encoding='utf-8',newline='\n')
