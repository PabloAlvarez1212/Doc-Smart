/*"use client"
import FormCiudad from "../../../../components/forms/CatalogoForm/FormCatalogo"
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
ESTE CODE ES PARA QUE COMPILE BIEN EL PROYECTO*/



"use client";

export default function Cities() {
    return <h2>Consulta de Ciudades (En construcción)</h2>;
}