from pathlib import Path
p=Path('frontend/components/ui/Input/Input.js');s=p.read_text(encoding='utf-8').replace('import { useState }','import { useEffect, useState }').replace('import { Eye, EyeOff }','import { motion, useAnimation, useReducedMotion } from "motion/react";\nimport { Eye, EyeOff }').replace('autoComplete, ...rest','autoComplete, validationAttempt, ...rest').replace('    const isPassword', '''    const animation = useAnimation();
    const reduced = useReducedMotion();
    const invalid = Boolean(rest['aria-invalid']);
    useEffect(() => {
        if (invalid && validationAttempt && !reduced) animation.start({x:[0,-3,3,0],transition:{duration:.18}});
    }, [validationAttempt, invalid, reduced, animation]);
    const isPassword''').replace('<div className={styles.container}>','<motion.div className={styles.container} initial={false} animate={animation}>').replace('</div>','</motion.div>');p.write_text(s,encoding='utf-8',newline='\n')
p=Path('frontend/components/forms/registerForm/RegisterForm.js');s=p.read_text(encoding='utf-8').replace('<Input ', '<Input validationAttempt={feedback.kind === "error" ? feedback.revision : 0} ');s=s.replace('aria-label={`Paso ${step} de ${totalSteps}`}','role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={step} aria-label="Progreso del registro"');p.write_text(s,encoding='utf-8',newline='\n')
p=Path('frontend/components/forms/loginForm/loginForm.js');s=p.read_text(encoding='utf-8').replace('<Input ', '<Input validationAttempt={feedback.kind === "error" ? feedback.revision : 0} ');p.write_text(s,encoding='utf-8',newline='\n')
# Both complete auth flows at desktop dark and mobile light.
p=Path('frontend/scripts/verify-design-corrections.cjs');s=p.read_text(encoding='utf-8');a=s.index("  await go('/login');await page.getByRole('button'");b=s.index('  await page.emulateMedia({reducedMotion',a)
s=s[:a]+'''  for(const [flowTheme,flowWidth] of [['light',390],['dark',1440]]){
  docMode='error';otpMode='error';completeMode='error';loginMode='error';for(const key of Object.keys(requests))delete requests[key];await page.setViewportSize({width:flowWidth,height:1000});await go('/login');await theme(flowTheme);
'''+s[a:b]+'''  }
'''+s[b:];p.write_text(s,encoding='utf-8',newline='\n')
