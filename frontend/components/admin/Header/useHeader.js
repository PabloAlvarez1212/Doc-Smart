"use client";
import { useRouter } from 'next/navigation'
import { logoutService } from '@/app/services/authService'
export default function useHeader(){
    const router = useRouter()
    const logout = async ()=>{
        try{
            await logoutService();
            router.push('/login')
        }catch(e){
            console.log(e);
            router.push('/login')
        }
    }
    return {logout};
}