"use client"
import Styles from "./Header.module.css";
import Image from "next/image";
import { Settings, UserCircle2Icon } from "lucide-react";
export default function Header() {
    return (
        <div className={Styles.containerHeader}>
            <div className={Styles.container}>
                <div className={Styles.logo}>
                    <Image src='/images/logo.png' width='130' height='100' alt="logo"/>
                    <h2><span>Doc</span>Smart</h2>
                </div>
                <div className={Styles.icons}>
                    <UserCircle2Icon size={40} className={Styles.icon}/>
                    <Settings size={40} color="#262626" className={Styles.icon}/>
                </div>
            </div>
        </div>
    )
}