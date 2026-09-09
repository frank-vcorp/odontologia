# VECTORIA_PLAN_VALIDACION

version: 1.0
nombre: Plan de Validación
discovery: CLINICA_DENTAL_DISCOVERY.md
fases: 5
checklist_obligatorio: false

# Fase 1 — Núcleo operativo

## Objetivo

Dejar disponible la base operativa real del consultorio para comenzar a registrar pacientes y catálogos esenciales sin datos ficticios.

## Comprobaciones

- Acceder con los usuarios contemplados en el alcance.
- Confirmar que Dentista y Recepcionista tienen acceso total.
- Crear un Paciente con alta rápida usando únicamente nombre y teléfono.
- Completar y editar posteriormente los datos opcionales del Paciente.
- Buscar Pacientes por nombre y teléfono.
- Confirmar que un Paciente no puede eliminarse ni inactivarse.
- Crear, editar y eliminar Servicios del catálogo.
- Confirmar que el Servicio permite precio opcional y marca de si genera Tratamiento.
- Crear Categorías financieras y verificar que se distinguen entre Ingreso y Egreso.
- Confirmar alta rápida de Categoría financiera.
- Verificar Métodos de pago iniciales y alta rápida de uno adicional.
- Confirmar que no existen datos demo o ficticios.

## Resultado esperado

El consultorio puede comenzar a capturar pacientes y configurar los catálogos mínimos reales que utilizará en las siguientes fases.

# Fase 2 — Agenda y Consultas

## Objetivo

Permitir la operación diaria básica del consultorio: programar atenciones y registrar lo que realmente ocurrió en cada visita.

## Comprobaciones

- Abrir Agenda en vista semanal.
- Cambiar rápidamente a vista diaria y regresar a Hoy.
- Crear una Cita haciendo clic en un espacio libre.
- Confirmar que fecha y hora se precargan y que la duración por defecto es de una hora.
- Crear una Cita con duración mayor a una hora.
- Intentar crear una Cita empalmada y confirmar que el sistema la impide sin perder la captura.
- Reagendar una Cita desde su acción específica.
- Cancelar una Cita y confirmar que desaparece de la vista normal y libera el horario.
- Crear una Consulta desde una Cita.
- Crear una Consulta sin Cita previa.
- Confirmar que la Consulta hereda datos de la Cita cuando corresponde.
- Agregar varios Servicios a una misma Consulta.
- Relacionar una Consulta con uno o varios Tratamientos cuando existan.
- Confirmar que la fecha/hora actual se propone automáticamente y puede corregirse.
- Adjuntar archivos a Paciente y Consulta.
- Confirmar que los archivos de Consulta aparecen en el expediente general conservando su origen.
- Dejar pasar una Cita sin Consulta y comprobar que queda Invalidada pero permite crear Consulta posteriormente.

## Resultado esperado

Recepción puede administrar la Agenda y el dentista puede registrar Consultas reales de forma rápida, sin necesidad de flujos clínicos complejos.

# Fase 3 — Presupuestos y Tratamientos

## Objetivo

Permitir cotizar servicios y tratamientos, autorizar parcialmente propuestas y dar continuidad clínica/económica a Tratamientos.

## Comprobaciones

- Crear un Presupuesto con varios conceptos.
- Confirmar que cada concepto toma precio de catálogo como sugerencia y permite modificarlo.
- Autorizar solo algunos conceptos.
- Dejar otros conceptos pendientes y autorizarlos posteriormente.
- Editar y eliminar conceptos pendientes.
- Confirmar que un concepto autorizado no puede desautorizarse ni eliminarse.
- Autorizar un concepto que genera Tratamiento y confirmar que crea exactamente un Tratamiento Activo.
- Autorizar varios conceptos de tratamiento y confirmar que cada uno crea un Tratamiento independiente.
- Autorizar un Servicio aislado y confirmar que no crea deuda ni Cita automáticamente.
- Usar Agendar cita desde un Servicio aislado autorizado y confirmar precarga de Paciente y Servicio.
- Crear un Tratamiento directamente desde cero.
- Confirmar que toma precio del catálogo como sugerencia editable.
- Configurar frecuencia recomendada.
- Relacionar Consultas con el Tratamiento.
- Crear siguiente Cita desde el Tratamiento y confirmar sugerencia a partir de la última Consulta.
- Marcar Tratamiento como Terminado.
- Marcar otro como Cancelado y confirmar que deja de aportar saldo activo.
- Adjuntar archivos al Tratamiento y confirmarlos en el expediente general.
- Generar, descargar y volver a consultar el PDF profesional de un Presupuesto.

## Resultado esperado

El consultorio puede manejar propuestas comerciales y Tratamientos longitudinales sin duplicar registros ni convertir la periodicidad en una recurrencia rígida.

# Fase 4 — Pagos y Finanzas

## Objetivo

Controlar cobros, abonos, saldos, ingresos, egresos y devoluciones con trazabilidad simple y sin duplicar información.

## Comprobaciones

- Registrar desde una Consulta un pago de Servicios generados en esa misma Consulta.
- Registrar desde una Consulta un abono a un Tratamiento.
- Cuando existan varios destinos, repartir un pago entre saldo general y Tratamientos.
- Confirmar que el sistema pregunta explícitamente a qué saldo aplicar el dinero.
- Intentar pagar más que el saldo y confirmar que el sistema lo impide.
- Confirmar que no existen saldos a favor.
- Registrar desde la ficha del Paciente el pago de deuda histórica por Servicios aislados.
- Registrar pagos con Efectivo, Transferencia y Tarjeta.
- Simular un cobro combinado registrando dos pagos con métodos distintos.
- Confirmar que cada Pago produce el Ingreso financiero correspondiente sin recaptura.
- Crear un Ingreso manual.
- Crear un Egreso manual.
- Editar y eliminar movimientos manuales.
- Confirmar que movimientos provenientes de Pagos no se modifican de forma independiente.
- Registrar una devolución como Egreso.
- Filtrar movimientos por fecha, tipo, categoría y Paciente cuando aplique.
- Consultar totales de Ingresos, Egresos, resultado neto y desglose por categoría.
- Verificar que un Tratamiento Terminado puede conservar saldo pendiente.
- Verificar que un Tratamiento Cancelado ya no aporta saldo pendiente activo.

## Resultado esperado

La recepción puede cobrar y controlar caja de manera simple, mientras los saldos del Paciente y Tratamientos permanecen coherentes con los movimientos financieros reales.

# Fase 5 — Integración funcional y cierre

## Objetivo

Validar el sistema completo como una operación diaria coherente, navegable y utilizable en distintos dispositivos.

## Comprobaciones

- Revisar la pantalla inicial con Agenda de hoy, próxima Cita, accesos rápidos y resumen discreto de saldos.
- Recorrer Paciente → Presupuesto → Tratamiento → Cita → Consulta → Pago → Finanzas.
- Recorrer Paciente → Cita → Consulta → Servicio aislado → saldo general → pago posterior.
- Confirmar navegación directa entre relaciones relevantes.
- Verificar estados vacíos en módulos sin registros.
- Verificar mensajes comprensibles ante errores recuperables.
- Confirmar que reintentar una autorización no duplica Tratamientos.
- Confirmar que reintentar una operación financiera no duplica movimientos.
- Revisar comportamiento en escritorio.
- Revisar comportamiento en tablet.
- Revisar comportamiento en móvil.
- Confirmar que las funciones esenciales permanecen disponibles en móvil.
- Confirmar instalación como PWA cuando aplique.
- Confirmar que no existe dependencia de operación offline.
- Revisar que el sistema no contenga módulos de Inventario ni recordatorios automáticos.
- Confirmar que no existen datos demo.
- Revisar que cambios de Catálogo no alteren históricos.

## Resultado esperado

Clínica Dental opera de extremo a extremo conforme al Discovery, con una experiencia simple para un consultorio que migra desde papel y lápiz y sin introducir complejidad técnica o funcional no requerida.
