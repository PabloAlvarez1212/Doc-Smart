from pathlib import Path
root=Path('frontend')
def edit(p,fn):
 p=root/p; p.write_text(fn(p.read_text(encoding='utf-8')),encoding='utf-8',newline='\n')
for p in ['components/ui/DocSmartNav/DocSmartNav.js','components/admin/Header/Header.js']:
 edit(p,lambda s:s.replace("import ThemeSelector from '../Theme/ThemeSelector';",'').replace('import ThemeSelector from "../../ui/Theme/ThemeSelector";','').replace('<div className={styles.desktopTheme}><ThemeSelector /></div>','').replace('<ThemeSelector />',''))
edit('components/admin/Header/Header.module.css',lambda s:s+'\n.header{grid-template-columns:260px minmax(0,1fr) auto}\n@media(max-width:1100px){.header{grid-template-columns:auto 1fr auto}}\n')
edit('components/ui/DocSmartNav/DocSmartNav.module.css',lambda s:s.replace('height:132px','height:156px').replace('height:100px','height:108px')+'\n.navigation nav ul{margin:0;padding:4px 0;flex-wrap:nowrap}.reserve{flex-shrink:0}.bar{max-height:calc(100dvh - 24px)}\n@media(max-width:1100px){.navigation nav ul{padding-top:12px}}\n@media(prefers-reduced-motion:reduce){.bar,.navigation,.toggle i{transition:none}}\n')
edit('src/app/variables.css',lambda s:s+'''\n:root{--text-primary:var(--color-text);--accent:var(--color-dark);--blue-card:#17366f;--blue-card-text:#fff;--blue-card-secondary:#dce8ff;--blue-card-surface:#23477e;--blue-card-border:#6382af;--blue-action:#1f55b7;--blue-action-hover:#17489e;--blue-action-text:#fff;--motion-fast:160ms;--motion-standard:240ms;--motion-ease:cubic-bezier(.22,1,.36,1)}
:root[data-theme="dark"]{--blue-card:#172e56;--blue-card-surface:#233f69;--blue-card-secondary:#dce8ff;--blue-card-border:#6382af}
''')
edit('components/patient/Home/AppointmentsList/AppointmentsList.module.css',lambda s:s.replace('color: #fff','color: var(--blue-card-text)').replace('background: #17366f','background: var(--blue-card)').replace('var(--text-secondary)','var(--blue-card-secondary)').replace('var(--color-dark)','var(--blue-card-secondary)').replace('background: var(--glass)','background: var(--blue-card-surface)').replace('background: var(--surface)','background: var(--blue-card-surface)').replace('background: var(--surface-muted)','background: var(--blue-card-surface)').replace('color: #f6f9ff','color: var(--blue-card-text)')+'\n.schedule strong,.heading h2,.doctor h3,.empty h3{color:var(--blue-card-text)}.footer a:hover,.empty>a:hover{background:#305488;color:var(--blue-card-text)}.status{border:1px solid var(--blue-card-border)}\n')
edit('components/patient/Home/QuickActions/QuickActions.module.css',lambda s:s.replace('background: #1f55b7','background: var(--blue-action)').replace('color: #fff','color: var(--blue-action-text)').replace('.primary small { color: var(--text-secondary)','.primary small { color: var(--blue-card-secondary)').replace('background: #17489e','background: var(--blue-action-hover)'))
# Accessible input forwards field metadata and has a stable accessible name.
edit('components/ui/Input/Input.js',lambda s:s.replace('sizeEye,autoComplete })','sizeEye,autoComplete, ...rest })').replace('type={inputType}','{...rest}\n                aria-label={rest["aria-label"] || placeholder || name}\n                type={inputType}'))
edit('components/ui/Input/Input.module.css',lambda s:s+'''\n.input{min-height:48px;border:1px solid var(--border);border-radius:12px;padding:12px 44px 12px 14px;text-align:left;color:var(--text-primary);background:var(--surface-muted);transition:border-color var(--motion-fast),box-shadow var(--motion-fast),background var(--motion-fast)}
.input:focus{border-color:var(--focus);background:var(--surface);box-shadow:0 0 0 3px color-mix(in srgb,var(--focus) 20%,transparent)}
.input[aria-invalid="true"]{border-color:var(--ink-red)}.input:disabled,.input[readonly]{color:var(--text-secondary);opacity:1}.eyeButton{width:40px;height:40px;right:4px;border-radius:8px}.eyeButton:hover{background:var(--surface)}
@media(prefers-reduced-motion:reduce){.input{transition:none}}
''')
# Same card architecture for both auth pages, no server/client initial branching.
card='''
.container{width:min(100%,520px);padding:clamp(24px,5vw,40px);border:1px solid var(--border);border-radius:28px;box-shadow:var(--shadow);gap:20px;color:var(--text-primary);background:var(--surface);min-height:0}
.logo{gap:8px}.logo h1{font-size:26px;letter-spacing:-.045em;font-weight:700}.logo img{width:56px;height:56px;object-fit:contain;background:#fff;border-radius:16px;padding:5px}
.container h2{font-size:24px;line-height:1.2;letter-spacing:-.035em;font-weight:650}.formWrapper,.form{width:100%}.containerLinks{margin-top:4px;gap:6px;width:100%}.link,.link:hover{font-size:14px;min-height:40px;color:var(--accent);opacity:1;transition:color var(--motion-fast);text-decoration:none}.link:hover{text-decoration:underline}
@media(max-width:480px){.container{border-radius:22px;padding:24px 20px}}
'''
for p in ['src/app/(auth)/login/login.module.css','src/app/(auth)/register/page.module.css']: edit(p,lambda s:s+card)
edit('components/forms/loginForm/loginForm.module.css',lambda s:s+'''\n.formLogin{margin-top:0;gap:16px}.inputs{width:100%;gap:10px;align-items:stretch}.input{font-size:16px!important}.btn{width:100%;min-height:48px;font-size:15px!important;margin-top:0}.error{margin:0;color:var(--ink-red);font-size:13px;text-align:left}.label{font-size:13px;font-weight:600;color:var(--text-primary);margin-top:6px}.status{width:100%}\n''')
edit('components/forms/registerForm/RegisterForm.module.css',lambda s:s+'''\n.inputs{width:100%;gap:12px;text-align:left}.select{border:1px solid var(--border);border-radius:12px;min-height:48px;padding:12px 14px;text-align:left;background:var(--surface-muted);color:var(--text-primary);appearance:auto}.select:focus{border-color:var(--focus);box-shadow:0 0 0 3px color-mix(in srgb,var(--focus) 20%,transparent)}.error{font-size:13px;margin:0}.stepTitle{font-size:13px;line-height:1.5}.progress{display:flex;gap:5px;width:100%;margin-bottom:6px}.progress span{height:4px;flex:1;border-radius:4px;background:var(--border)}.progress span[data-complete="true"]{background:var(--accent)}.uploadCopy p{color:var(--text-secondary)}.buttons{gap:10px}.buttons button{min-height:48px}.select:disabled{opacity:1;color:var(--text-secondary)}\n''')
# Reusable Motion feedback: only animates when status changes, stable SSR idle markup.
p=root/'components/ui/VerificationStatus';p.mkdir(exist_ok=True)
(p/'VerificationStatus.js').write_text('''"use client";
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { LoaderCircle, CircleAlert } from 'lucide-react';
import styles from './VerificationStatus.module.css';
export default function VerificationStatus({ state = { kind: 'idle', message: '', revision: 0 } }) {
 const reduced = useReducedMotion();
 return <div className={styles.region} role="status" aria-live="polite" aria-atomic="true"><AnimatePresence initial={false} mode="wait">{state.message && <motion.div key={`${state.kind}-${state.revision}`} className={`${styles.notice} ${styles[state.kind] || ''}`} initial={{opacity:0}} animate={{opacity:1,x:state.kind==='error'&&!reduced?[0,-3,3,-2,0]:0}} exit={{opacity:0}} transition={{duration:reduced?0:.22}}>
 {state.kind==='pending'?<LoaderCircle className={styles.spinner} size={22} aria-hidden="true"/>:state.kind==='error'?<CircleAlert size={22} aria-hidden="true"/>:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor"/><motion.path d="m7 12 3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:reduced?0:.24}}/></svg>}
 <span>{state.message}</span></motion.div>}</AnimatePresence></div>
}
''',encoding='utf-8',newline='\n')
(p/'VerificationStatus.module.css').write_text('''.region{width:100%;min-width:0}.notice{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--border);border-radius:12px;color:var(--text-primary);background:var(--surface-muted);font-size:13px;line-height:1.5}.notice svg{flex-shrink:0}.error{color:var(--ink-red);background:var(--tone-red)}.success{color:var(--ink-green);background:var(--tone-green)}.pending{color:var(--accent);background:var(--tone-blue)}.spinner{animation:turn .8s linear infinite}@keyframes turn{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.spinner{animation:none}}
''',newline='\n')
# Card entrances via client component, initial opacity 1 so readable and hydration stable.
(root/'components/ui/VerificationStatus/AuthCard.js').write_text('''"use client";
import {motion} from 'motion/react';
export default function AuthCard({children,className}){return <motion.div className={className} initial={{opacity:1,y:10}} animate={{opacity:1,y:0}} transition={{type:'spring',bounce:0,duration:.24}}>{children}</motion.div>}
''',newline='\n')
for p in ['src/app/(auth)/login/page.js','src/app/(auth)/register/page.js']:
 edit(p,lambda s:s.replace('import Image from', 'import AuthCard from "../../../../components/ui/VerificationStatus/AuthCard";\nimport Image from').replace('<div className={styles.container}>','<AuthCard className={styles.container}>').replace('            </div>\n        </div>','            </AuthCard>\n        </div>') if 'login/page' in p else s.replace('import Image from','import AuthCard from "../../../../components/ui/VerificationStatus/AuthCard";\nimport Image from').replace('<div className={styles.container}>','<AuthCard className={styles.container}>').replace('      </div>\n    </div>','      </AuthCard>\n    </div>'))
print('Theme locations, blue palettes, navbar reserve, auth cards and feedback component updated')
