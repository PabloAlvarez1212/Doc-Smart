import { use, useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import { obtenerPrimerError } from '@/app/utils/errrorUtils'
import { getDepartamentosService } from '@/app/services/catalogs'

export const useCatalogoForm = ({ crearService }) => {
    const [formData, setFormData] = useState({ nombre: '', departamento_id: '' })
    const [departamentos,setDepartamentos] = useState([]);
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    useEffect(()=>{
        const cargarDepartamentos = async () => {  
            try{
                const res = await getDepartamentosService();
                setDepartamentos(res.data);
            }
            catch(error){
                console.log(error)
            }
        }
        cargarDepartamentos()
    } , [])
    const crear = async (e) => {
        e.preventDefault()  
        try {
            await crearService(formData)
            await Swal.fire({ icon: 'success', title: 'Creado correctamente' })
            setFormData({ nombre: '', departamento_id: '' })
        } catch (error) {
            const errores = error.response?.data?.errores
            const mensaje = obtenerPrimerError(errores) || 'Error al conectar con el servidor'
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: mensaje
            })
        }
    }

    return { formData, handleChange, crear, departamentos }
}