"use client"
import FormCiudad from "../../../../components/forms/CatalogoForm/formCatalogoCiudad"
import { useCatalogoForm } from "../../../../components/forms/CatalogoForm/useCatalogoForm"
import { crearCiudadService } from "@/app/services/catalogs"
export default function Cities() {
    const { formData, handleChange, crear,departamentos } = useCatalogoForm({
        crearService: crearCiudadService,
    })
    return (
        <div>
            <FormCiudad titulo="Ciudades" formData={formData}
                handleChange={handleChange}
                onSubmit={crear} 
                departamentos={departamentos}
                />
        </div>
    )
}