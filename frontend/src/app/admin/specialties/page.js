"use client"
import FormCatalogo from "../../../../components/forms/CatalogoForm/formCatalogo"
import { useCatalogoForm } from "../../../../components/forms/CatalogoForm/useCatalogoForm"
import { crearEspecialidadService } from "@/app/services/doctorServices" 
export default function Specialties() {
    const { formData, handleChange, crear } = useCatalogoForm({
        crearService: crearEspecialidadService,
    })
    return (
        <div>
            <FormCatalogo titulo="Especialidades" formData={formData}
                handleChange={handleChange}
                onSubmit={crear} />
        </div>
    )
}