"use client"
import FormCatalogo from "../../../../components/forms/CatalogoForm/formCatalogo"
import { useCatalogoForm } from "../../../../components/forms/CatalogoForm/useCatalogoForm"
import { crearRolService } from "@/app/services/catalogs"
export default function Roles() {
    const { formData, handleChange, crear } = useCatalogoForm({
        crearService: crearRolService,
    })
    return (
        <div>
            <FormCatalogo titulo="Roles" formData={formData}
                handleChange={handleChange}
                onSubmit={crear} />
        </div>
    )
}