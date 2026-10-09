"use client";
import {motion} from 'motion/react';
export default function AuthCard({children,className}){return <motion.div className={className} initial={{opacity:1,y:10}} animate={{opacity:1,y:0}} transition={{type:'spring',bounce:0,duration:.24}}>{children}</motion.div>}
