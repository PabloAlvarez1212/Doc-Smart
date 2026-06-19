"use client"
import FormCatalogo from "../../../../components/forms/CatalogoForm/formCatalogo"
import { useCatalogoForm } from "../../../../components/forms/CatalogoForm/useCatalogoForm"
import { crearMediosService } from "@/app/services/catalogs"
export default function Channel() {
    const { formData, handleChange, crear } = useCatalogoForm({
        crearService: crearMediosService,
    })
    return (
        <div>
            <FormCatalogo titulo="Medios" formData={formData}
                handleChange={handleChange}
                onSubmit={crear} />
        </div>
    )
}