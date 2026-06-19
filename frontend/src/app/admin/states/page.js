"use client"
import FormCatalogo from "../../../../components/forms/CatalogoForm/formCatalogo"
import { useCatalogoForm } from "../../../../components/forms/CatalogoForm/useCatalogoForm"
import { crearEstadosService } from "@/app/services/catalogs"
export default function States() {
    const { formData, handleChange, crear } = useCatalogoForm({
        crearService: crearEstadosService,
    })
    return (
        <div>
            <FormCatalogo titulo="Estados" formData={formData}
                handleChange={handleChange}
                onSubmit={crear} />
        </div>
    )
}