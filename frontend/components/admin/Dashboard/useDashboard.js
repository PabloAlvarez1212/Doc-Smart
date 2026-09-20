"use client"
import { obtenerMetricasSistemaService } from "@/app/services/adminServices";
import { useEffect, useState } from "react";


export function useDashboard(){
    const [metricasTarjetas,setMetricasTarjetas] = useState(null)
    useEffect(()=>{
        cargarMetricasTarjetas();
    },[])
    const cargarMetricasTarjetas =  async () => {
        try{
            const data = await obtenerMetricasSistemaService()
            setMetricasTarjetas(data.data)
        }catch(error){
            console.log("Error en el servidor")
        }
    }
    return{metricasTarjetas}
}
