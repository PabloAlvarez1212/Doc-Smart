import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { obtenerPrimerError } from "@/app/utils/errrorUtils";

/**
 * useCrud - Hook genérico para manejar operaciones CRUD
 *
 * Params:
 * - getService:    async () => { data: [] }   → obtener todos
 * - crearService:  async (formData) => {}      → crear
 * - editarService: async (id, formData) => {}  → actualizar
 * - eliminarService: async (id) => {}          → eliminar
 * - camposIniciales: Object                    → estado inicial del formulario
 */
export function useCrud({
  getService,
  crearService,
  editarService,
  eliminarService,
  camposIniciales = { nombre: "" },
}) {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [formData, setFormData] = useState(camposIniciales);
  const [guardando, setGuardando] = useState(false);

  // ── Cargar datos ────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await getService();
      // Soporta tanto { data: [] } como [] directo
      setDatos(Array.isArray(res) ? res : res.data ?? []);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error al cargar",
        text: "No se pudieron obtener los datos del servidor.",
      });
    } finally {
      setCargando(false);
    }
  }, [getService]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ── Manejo de inputs ────────────────────────────────────
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── Abrir modal para CREAR ──────────────────────────────
  const abrirModalNuevo = () => {
    setFormData(camposIniciales);
    setItemSeleccionado(null);
    setModoEdicion(false);
    setModalAbierto(true);
  };

  // ── Abrir modal para EDITAR ─────────────────────────────
  const abrirModalEditar = (item) => {
    setFormData({ ...camposIniciales, ...item });
    setItemSeleccionado(item);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  // ── Cerrar modal ────────────────────────────────────────
  const cerrarModal = () => {
    setModalAbierto(false);
    setFormData(camposIniciales);
    setItemSeleccionado(null);
  };

  // ── Guardar (crear o editar) ─────────────────────────────
  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (modoEdicion) {
        await editarService(itemSeleccionado.id, formData);
        await Swal.fire({ icon: "success", title: "Actualizado correctamente", timer: 1500, showConfirmButton: false });
      } else {
        await crearService(formData);
        await Swal.fire({ icon: "success", title: "Creado correctamente", timer: 1500, showConfirmButton: false });
      }
      cerrarModal();
      cargarDatos();
    } catch (error) {
      const errores = error.response?.data?.errores || error.response?.data;
      const mensaje = obtenerPrimerError(errores) || "Error al conectar con el servidor";
      Swal.fire({ icon: "error", title: "Error", text: mensaje });
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar con confirmación ────────────────────────────
  const eliminar = async (item) => {
    const confirm = await Swal.fire({
      title: "¿Estás seguro?",
      text: `Se eliminará "${item.nombre ?? "este registro"}" permanentemente.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#A32D2D",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    try {
      await eliminarService(item.id);
      await Swal.fire({ icon: "success", title: "Eliminado", timer: 1200, showConfirmButton: false });
      cargarDatos();
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error al eliminar", text: "No se pudo eliminar el registro." });
    }
  };

  return {
    datos,
    cargando,
    formData,
    handleChange,
    modalAbierto,
    modoEdicion,
    guardando,
    abrirModalNuevo,
    abrirModalEditar,
    cerrarModal,
    guardar,
    eliminar,
    cargarDatos,
  };
}
