# VECTORIA DISCOVERY — CLÍNICA DENTAL

## 1. Identificación

- **Nombre formal del proyecto:** Clínica Dental
- **Repositorio GitHub:** https://github.com/Vector-IA-mx/odontologia
- **Zona horaria operativa:** America/Mexico_City
- **Tipo de producto:** Sistema web responsivo para operación de consultorio dental
- **Enfoque de adopción:** máxima simplicidad operativa; el consultorio actualmente trabaja con papel y lápiz
- **Tema visual:** claro, moderno, profesional, SaaS, sobrio y rápido
- **Responsive:** escritorio, tablet y móvil
- **PWA:** instalable cuando sea razonable; no se requiere operación offline

## 2. Objetivo

Centralizar la operación diaria de un consultorio dental de un solo dentista, cubriendo pacientes, agenda, consultas clínicas, expedientes, presupuestos, tratamientos, pagos, finanzas y catálogos, con trazabilidad entre registros relacionados y con la menor fricción posible para el dentista y la recepcionista.

El sistema debe sustituir progresivamente el uso de papel y lápiz sin imponer flujos clínicos o administrativos innecesarios.

## 3. Principios funcionales

1. **La Consulta es el centro clínico.**
   - La Cita representa lo programado.
   - La Consulta representa lo que realmente ocurrió.
   - El Tratamiento representa un proceso clínico de varias atenciones.
   - El Presupuesto representa una propuesta/autorización comercial.
   - El Pago representa dinero recibido y aplicado a un saldo concreto.
   - Finanzas refleja ingresos y egresos.

2. **Las relaciones relevantes deben ser navegables.**
   Ejemplos:
   - Paciente → Presupuesto → Tratamiento
   - Paciente → Cita → Consulta
   - Consulta → Tratamiento
   - Consulta → Pago
   - Pago → Movimiento financiero

3. **No duplicar capturas económicas.**
   Un pago registrado en su origen debe reflejarse en Finanzas sin requerir una segunda captura.

4. **Conservar valores históricos.**
   Cambios posteriores en catálogos no modifican precios o condiciones ya utilizadas en operaciones anteriores.

5. **Priorizar simplicidad.**
   No agregar estados, aprobaciones, campos ni pasos que no tengan valor operativo real.

6. **Sistema inicialmente vacío.**
   No incluir pacientes, tratamientos, presupuestos, consultas ni datos ficticios de demostración.

## 4. Usuarios y acceso

### 4.1 Usuarios contemplados

- Dentista
- Recepcionista
- Superusuario VectorIA

### 4.2 Permisos

En esta primera versión:

- Dentista: acceso total.
- Recepcionista: acceso total.
- Superusuario VectorIA: acceso total.

No existen diferencias funcionales de permisos entre Dentista y Recepcionista en esta versión.

Ambos pueden operar:
- pacientes;
- antecedentes médicos;
- expediente;
- agenda;
- consultas;
- observaciones clínicas;
- archivos;
- presupuestos;
- tratamientos;
- pagos;
- finanzas;
- catálogos;
- configuración incluida en alcance.

### 4.3 Administración de usuarios

- No se permite crear usuarios adicionales en el alcance actual.
- Los usuarios existentes pueden cambiar su contraseña.
- Debe existir el Superusuario inicial VectorIA conforme al estándar organizacional.
- Las credenciales sensibles no deben mostrarse nuevamente en interfaces, mensajes operativos ni registros visibles después de su establecimiento.

## 5. Mapa funcional

### Recorrido operativo
Paciente → Cita → Consulta → Servicios realizados → Pago

### Recorrido de tratamiento
Paciente → Tratamiento → Citas → Consultas → Abonos → Saldo

### Recorrido comercial
Paciente → Presupuesto → Conceptos autorizados → Tratamientos o servicios pendientes de atención

### Recorrido financiero
Pago → Ingreso financiero

Egreso manual o devolución → Egreso financiero

## 6. Módulo Pacientes

### 6.1 Propósito

Ser el punto central de consulta y navegación del historial clínico, operativo y económico del paciente.

### 6.2 Alta rápida

Campos obligatorios:
- Nombre completo
- Teléfono

No se bloquean ni advierten duplicados por teléfono.

### 6.3 Información ampliada

Campos opcionales:
- Correo
- Fecha de nacimiento
- Dirección
- Antecedentes médicos / datos relevantes
- Observaciones generales

Los antecedentes médicos se capturan en un único campo libre para maximizar rapidez.

No se requiere contacto de emergencia.

### 6.4 Edición y ciclo de vida

- Todos los datos pueden editarse libremente.
- El Paciente no se elimina.
- El Paciente no se inactiva.
- Permanece siempre consultable.
- Conserva todas sus relaciones históricas.

### 6.5 Vista de detalle

La vista abre en un resumen operativo con:
- saldo total pendiente;
- desglose de saldo general y saldos de Tratamientos activos;
- Tratamientos activos;
- próxima Cita;
- últimas Consultas;
- Presupuestos pendientes o parcialmente autorizados relevantes;
- accesos a Consultas, Tratamientos, Presupuestos, Expediente y Pagos;
- acción Registrar pago.

### 6.6 Historial prioritario

El historial principal del paciente es el de **Consultas**, no el de Citas.

Las Citas conservan valor administrativo y de agenda.

### 6.7 Búsqueda

En el módulo Pacientes:
- búsqueda por nombre;
- búsqueda por teléfono.

No existe buscador global del sistema.

En formularios que requieren seleccionar un Paciente debe existir búsqueda contextual.

## 7. Expediente y archivos

### 7.1 Procedencias válidas

Un archivo puede pertenecer a:
- Paciente;
- Consulta;
- Tratamiento.

### 7.2 Expediente general

Desde el Paciente debe poder verse el conjunto de archivos relacionados, conservando para cada uno:
- procedencia;
- fecha;
- registro de origen;
- navegación al registro de origen cuando aplique.

Los archivos no pierden su pertenencia original por aparecer en el expediente general.

### 7.3 Operación

Los archivos persistentes deben:
- conservarse;
- poder consultarse posteriormente;
- poder descargarse;
- pertenecer claramente al Paciente, Consulta o Tratamiento correspondiente.

No se crea un gestor documental general fuera de estas necesidades.

## 8. Módulo Agenda / Citas

### 8.1 Propósito

Ser una herramienta visual y rápida para la recepción, enfocada en reservar espacios futuros y acceder a la atención real.

### 8.2 Vista

- Vista semanal por defecto.
- Cambio rápido a vista diaria.
- Acceso directo a Hoy.
- Organización visual por horas.
- No existe drag & drop.
- La Agenda debe permitir identificar rápidamente las Citas vigentes y operar con pocos pasos.

### 8.3 Creación desde calendario

Al hacer clic en un espacio libre:
- abre directamente Nueva cita;
- fecha y hora quedan precargadas;
- duración por defecto: 1 hora;
- duración editable y puede superar 1 hora.

Si se hace clic en una Cita existente:
- abre la Cita y sus acciones disponibles.

Debe existir también una acción general de Nueva cita.

### 8.4 Datos funcionales

Una Cita contempla:
- Paciente;
- Servicio;
- Tratamiento relacionado, opcional;
- Fecha;
- Hora;
- Duración;
- Observación breve opcional.

Paciente y Servicio permiten alta rápida.

### 8.5 Disponibilidad

Existe un solo dentista.

Por lo tanto:
- no se permiten Citas empalmadas;
- se valida el rango completo ocupado;
- una Cita de varias horas bloquea ese periodo completo;
- al detectar conflicto, se impide guardar;
- se informa que existe una ocupación;
- la información ya capturada debe conservarse mientras se elige otro horario.

No existen restricciones por horario laboral: pueden programarse Citas en cualquier día u hora.

### 8.6 Ciclo de la Cita

La Cita se mantiene deliberadamente simple.

Estado operativo inicial:
- Programada

Desde cualquier Cita debe existir:
- Crear consulta

Si pasa su fecha/hora y no existe Consulta relacionada:
- queda Invalidada funcionalmente;
- permanece histórica;
- sigue permitiendo Crear consulta posteriormente.

Cuando posteriormente se crea la Consulta relacionada, deja de considerarse una Cita sin atención.

### 8.7 Cancelación

Al cancelar:
- deja de aparecer en la vista normal del calendario;
- libera inmediatamente el horario;
- puede crearse otra Cita en ese espacio;
- se conserva trazabilidad histórica discreta.

### 8.8 Reagendado

- Se realiza desde una acción explícita.
- No se realiza arrastrando la Cita.
- La nueva programación vuelve a validar empalmes.

### 8.9 Relación con Consulta

Al crear Consulta desde una Cita:
- hereda Paciente;
- hereda Servicio como valor inicial;
- hereda Tratamiento relacionado, si existe;
- esos valores pueden ajustarse dentro de la Consulta.

No es relevante modificar retroactivamente la Cita original según lo que finalmente se realizó.

### 8.10 Recordatorios

Fuera del alcance actual.

## 9. Módulo Consultas

### 9.1 Propósito

Registrar de forma práctica la atención real del paciente.

No existe flujo obligatorio de “En curso” y “Finalizada”.

### 9.2 Cómo nace

Una Consulta puede crearse:
- desde una Cita;
- directamente, sin Cita previa.

Si nace directamente:
- no se crea una Cita artificial.

### 9.3 Datos principales

- Paciente
- Fecha y hora actuales por defecto, editables
- Cita de origen, opcional
- Observaciones clínicas en un único campo libre
- Tratamientos atendidos, uno o varios
- Servicios realizados, uno o varios
- Archivos
- Pagos registrados
- Relaciones navegables correspondientes

Solo existe un dentista, por lo que no se requiere selección de profesional.

### 9.4 Servicios realizados

Una Consulta puede contener varios Servicios.

Cada Servicio:
- toma el precio de catálogo como sugerencia si existe;
- permite modificar el precio;
- no utiliza cantidades;
- puede editarse;
- puede eliminarse.

Cada línea representa un concepto realizado.

Si una Consulta proviene de una Cita:
- hereda inicialmente el Servicio previsto;
- puede modificarse, quitarse o complementarse.

### 9.5 Consulta y Tratamientos

Una Consulta puede relacionarse con uno o varios Tratamientos.

Una Consulta asociada a un Tratamiento:
- no genera cargo adicional por sí misma;
- registra la atención realizada;
- permite registrar abonos al Tratamiento.

Si durante esa Consulta se requiere cobrar algo adicional:
- debe agregarse un Servicio nuevo.

### 9.6 Servicios aislados y saldo general

Los Servicios aislados realizados:
- generan cargo;
- alimentan el saldo general del Paciente;
- no crean un Tratamiento por sí mismos.

### 9.7 Pagos desde Consulta

Desde una Consulta se puede pagar:
- Servicios aislados generados en esa misma Consulta;
- abonos a Tratamientos seleccionados.

No se usa una Consulta nueva para cobrar deuda histórica de Servicios aislados anteriores. Ese pago se realiza desde la ficha del Paciente.

### 9.8 Archivos

Los archivos adjuntos:
- pertenecen a la Consulta;
- aparecen también en el expediente general del Paciente;
- conservan referencia a la Consulta de origen.

### 9.9 Correcciones de Servicios

Los Servicios de la Consulta pueden editarse o eliminarse.

Eliminar o modificar un Servicio no borra automáticamente dinero ya recibido.

Si existe devolución real de dinero:
- se registra un Egreso por devolución.

## 10. Módulo Tratamientos

### 10.1 Propósito

Controlar procesos clínicos que se desarrollan a lo largo de varias Consultas, con continuidad clínica y económica.

### 10.2 Origen

Un Tratamiento puede crearse:
- automáticamente desde un concepto autorizado de Presupuesto marcado como “genera tratamiento”;
- directamente desde cero.

### 10.3 Creación desde Presupuesto

Al autorizar el concepto:
- el Tratamiento se crea automáticamente;
- se crea una sola vez;
- nace en estado Activo;
- hereda Paciente;
- hereda Servicio;
- hereda costo autorizado;
- conserva referencia al Presupuesto y al concepto de origen.

Si un Presupuesto autoriza varios conceptos de tratamiento:
- cada concepto genera su propio Tratamiento independiente.

### 10.4 Creación directa

Al crear desde cero:
- se selecciona un Servicio;
- si tiene precio de catálogo, se precarga como sugerencia;
- el precio puede modificarse antes de guardar.

### 10.5 Costo acordado

El Tratamiento conserva un costo total acordado histórico.

Cambios posteriores del catálogo no lo modifican.

### 10.6 Abonos y saldo

- Los abonos son libres.
- No existen mensualidades obligatorias.
- No existe calendario de pagos.
- No existe importe obligatorio por Consulta.
- Un abono no puede superar el saldo pendiente.

Mientras está Activo debe mostrar:
- costo acordado;
- total abonado;
- saldo restante.

### 10.7 Frecuencia recomendada

Campo opcional.

Ejemplos funcionales:
- cada 15 días;
- cada 1 mes;
- cada 6 semanas;
- sin frecuencia definida.

Su única función es sugerir la siguiente Cita.

No:
- crea Citas automáticamente;
- obliga a mantener una recurrencia.

### 10.8 Crear siguiente cita

Desde el detalle del Tratamiento debe existir:
- Crear siguiente cita

Si existe frecuencia recomendada y una última Consulta:
- se sugiere fecha = última Consulta + frecuencia recomendada.

La fecha puede ajustarse manualmente.

La nueva Cita debe respetar la prevención de empalmes.

### 10.9 Estados

- Activo
- Terminado
- Cancelado

### 10.10 Terminado

Un Tratamiento Terminado:
- representa un tratamiento completado;
- puede conservar saldo pendiente;
- si existe saldo, sigue siendo deuda del Paciente.

### 10.11 Cancelado

Un Tratamiento Cancelado:
- representa terminación anticipada;
- no solicita motivo;
- conserva costo acordado;
- conserva total abonado;
- conserva Consultas;
- conserva el saldo que existía;
- el importe restante deja de considerarse deuda activa del Paciente.

No se genera Egreso por la parte no pagada porque ese dinero nunca se recibió.

### 10.12 Notas

Campo libre de notas/observaciones generales del Tratamiento.

Es independiente de las observaciones de cada Consulta.

### 10.13 Sin avance porcentual

No existe porcentaje de avance.

El seguimiento se entiende mediante:
- estado;
- Consultas;
- última Consulta;
- frecuencia recomendada;
- próxima Cita;
- costo;
- abonos;
- saldo;
- notas.

### 10.14 Vista de detalle

Debe mostrar:
- Paciente;
- Servicio;
- Presupuesto de origen, si existe;
- estado;
- costo acordado;
- total abonado;
- saldo;
- frecuencia recomendada;
- notas;
- última Consulta;
- historial de Consultas;
- Citas relacionadas relevantes;
- archivos;
- acción Crear siguiente cita.

## 11. Módulo Presupuestos

### 11.1 Propósito

Preparar propuestas económicas para un Paciente y registrar autorización por concepto.

### 11.2 Conceptos

Un Presupuesto puede incluir múltiples conceptos.

Cada concepto puede ser:
- Servicio aislado;
- Servicio que genera Tratamiento.

### 11.3 Precio

Cada concepto:
- toma el precio del Servicio como sugerencia si existe;
- permite modificarlo;
- conserva el precio autorizado históricamente.

### 11.4 Estados de concepto

- Pendiente
- Autorizado
- Rechazado

La autorización puede ser parcial.

### 11.5 Estado global

El Presupuesto debe reflejar su situación global de forma comprensible, contemplando al menos:
- Borrador
- Presentado
- Parcialmente autorizado
- Autorizado
- Rechazado
- Cancelado

### 11.6 Autorización parcial

- Se pueden autorizar algunos conceptos y dejar otros pendientes.
- Los conceptos pendientes pueden autorizarse posteriormente sobre el mismo Presupuesto.
- Un concepto autorizado no puede desautorizarse.

### 11.7 Edición

En un Presupuesto parcialmente autorizado:
- los conceptos Pendientes pueden editarse;
- se puede cambiar Servicio o precio antes de su autorización;
- los conceptos Autorizados no se modifican retroactivamente.

### 11.8 Eliminación de conceptos

- Un concepto Pendiente puede eliminarse.
- Esto es válido aunque existan otros conceptos Autorizados.
- Un concepto Autorizado no puede eliminarse.

### 11.9 Tratamientos autorizados

Si un concepto autorizado genera Tratamiento:
- crea automáticamente un Tratamiento independiente;
- lo crea una sola vez;
- nace Activo;
- conserva referencias.

### 11.10 Servicios aislados autorizados

Si un concepto autorizado no genera Tratamiento:
- no crea Cita automáticamente;
- no crea deuda;
- no crea ingreso;
- queda autorizado y pendiente de atención;
- ofrece la acción Agendar cita;
- al Agendar cita precarga Paciente y Servicio.

La deuda solo nace cuando el Servicio se registra como realizado en una Consulta.

No se requiere vincular posteriormente la Consulta con el concepto autorizado para marcarlo como realizado.

### 11.11 Pagos

No se permiten pagos desde el Presupuesto.

- Si el concepto genera Tratamiento, los abonos se realizan sobre el Tratamiento ya creado.
- Si es Servicio aislado, el dinero se registra cuando exista una Consulta con el Servicio realizado.

### 11.12 Vigencia

Los Presupuestos no vencen.

Los conceptos Pendientes pueden permanecer así indefinidamente.

### 11.13 PDF

Desde el Presupuesto se puede generar un PDF profesional para:
- imprimir;
- descargar;
- entregar al Paciente.

Debe mostrar al menos:
- Paciente;
- fecha;
- conceptos;
- precio de cada concepto;
- total;
- estado de conceptos cuando corresponda;
- presentación profesional.

El archivo generado:
- pertenece al Presupuesto;
- se conserva;
- puede volver a consultarse y descargarse.

Si el Presupuesto cambia, una nueva generación refleja la versión vigente sin perder documentos previos relevantes cuando exista valor histórico.

## 12. Catálogo de Servicios

### 12.1 Campos

- Nombre
- Precio opcional
- ¿Genera tratamiento? Sí / No

### 12.2 Reglas

- El precio es una sugerencia, no un valor obligatorio.
- Puede modificarse al utilizar el Servicio en Presupuesto, Consulta o Tratamiento.
- Cambios posteriores no modifican operaciones históricas.
- Permite alta rápida desde otros flujos.
- Se puede editar aunque ya haya sido utilizado.
- Se puede eliminar aunque ya haya sido utilizado.
- Al eliminarse deja de estar disponible para nuevas capturas, sin alterar históricos.

## 13. Pagos

### 13.1 Principios

Todo pago debe aplicarse a un destino concreto.

Destinos posibles:
- saldo general del Paciente;
- Tratamiento específico.

No existen saldos a favor.

### 13.2 Límite

Un pago:
- no puede superar el saldo al que se aplica;
- no puede superar el importe pendiente de Servicios aislados de la Consulta cuando se cobra desde esa Consulta.

### 13.3 Distribución

Si el Paciente entrega dinero para más de un destino:
- el usuario debe indicar explícitamente la aplicación;
- puede repartirse entre varios destinos.

### 13.4 Método de pago

Catálogo inicial:
- Efectivo
- Transferencia
- Tarjeta

Permite alta rápida de otros métodos.

Cada Pago utiliza un solo método.

Si un cobro combina métodos:
- se registran pagos separados aplicados al mismo saldo.

### 13.5 Deuda histórica de Servicios aislados

Se paga desde la ficha del Paciente mediante Registrar pago.

### 13.6 Devoluciones

No se manejan saldos a favor.

Si se devuelve dinero:
- se registra un Egreso por devolución;
- conserva referencia al Paciente y a la operación relacionada cuando aplique.

## 14. Módulo Finanzas

### 14.1 Propósito

Control simple de caja.

No incluye:
- contabilidad formal;
- cuentas por pagar;
- cuentas por cobrar formales;
- pólizas;
- centros de costo;
- estructuras contables complejas.

### 14.2 Tipos

- Ingreso
- Egreso

### 14.3 Origen de Ingresos

Pueden ser:
- automáticos desde Pagos;
- manuales.

Un Pago no debe capturarse otra vez en Finanzas.

### 14.4 Egresos

Se registran manualmente.

Incluyen:
- gastos operativos;
- devoluciones;
- otros conceptos definidos por categoría.

### 14.5 Movimiento financiero

Datos funcionales:
- fecha;
- tipo;
- importe;
- categoría;
- concepto/descripción;
- Paciente opcional;
- referencia a operación de origen cuando exista.

### 14.6 Categorías financieras

Catálogo simple.

Cada categoría indica si aplica a:
- Ingreso;
- Egreso.

Permite:
- administración desde listado;
- alta rápida al capturar un movimiento.

No existen subcategorías ni jerarquías.

### 14.7 Edición y eliminación

Movimientos manuales:
- editables;
- eliminables.

Movimientos originados automáticamente por Pagos:
- no deben modificarse de forma independiente;
- deben conservar coherencia con su operación de origen.

### 14.8 Listado y filtros

Filtros principales:
- rango de fechas;
- Ingreso/Egreso;
- categoría;
- Paciente cuando exista relación.

### 14.9 Reportes

Inicialmente:
- total de Ingresos;
- total de Egresos;
- resultado neto;
- desglose por categoría;
- resultados por periodo;
- filtros por método de pago cuando corresponda.

## 15. Configuración y catálogos auxiliares

Alcance mínimo:
- Catálogo de Servicios
- Categorías financieras
- Métodos de pago
- Cambio de contraseña de usuarios existentes

No se incluyen datos generales del consultorio, logo ni configuración documental adicional en esta versión.

## 16. Pantalla inicial

Debe ser operativa y sobria.

Prioriza:
- Agenda de hoy;
- próxima Cita;
- accesos rápidos:
  - Nueva cita
  - Nuevo paciente
  - Nueva consulta
- resumen discreto de saldos pendientes.

No debe convertirse en un dashboard decorativo.

## 17. Reglas de integridad y prevención de duplicados

1. Un concepto autorizado de Presupuesto que genera Tratamiento crea exactamente un Tratamiento.
2. Un Pago debe reflejarse una sola vez en Finanzas.
3. Un Servicio realizado en Consulta no puede producir cargos duplicados por estar relacionado con un Tratamiento.
4. Una Consulta de Tratamiento no genera costo adicional por sí misma.
5. No se permite pagar por encima de un saldo.
6. No existen saldos a favor.
7. Citas empalmadas están prohibidas.
8. Cancelar una Cita libera inmediatamente su horario.
9. Cambios de catálogo no modifican históricos.
10. Eliminar un Servicio del catálogo no elimina su presencia histórica.
11. Un Tratamiento Cancelado deja de aportar saldo pendiente activo.
12. Un Tratamiento Terminado puede conservar saldo pendiente.
13. Un Servicio aislado autorizado en Presupuesto no genera deuda hasta realizarse en una Consulta.
14. Un Presupuesto no recibe pagos.

## 18. Estados de uso y errores

### Estado vacío
El sistema inicia sin datos operativos ficticios.

Los módulos deben comunicar claramente que aún no existen registros y ofrecer la acción principal correspondiente cuando aplique.

### Procesamiento
Cuando una operación esté ejecutándose:
- evitar duplicar acciones;
- comunicar que la operación está en curso.

### Éxito
Las operaciones relevantes deben confirmar resultado y mostrar el registro creado o actualizado cuando sea útil.

### Error recuperable
Debe:
- explicar qué no pudo completarse;
- conservar la información capturada cuando sea razonable;
- permitir corregir o reintentar.

### Conflicto de Agenda
Si existe empalme:
- no guardar;
- explicar que el horario ya está ocupado;
- permitir seleccionar otro horario sin recapturar el resto.

### Operaciones parciales
Si una parte de una operación ya se completó correctamente, no debe duplicarse al reintentar otra parte.

Ejemplo:
- si un Tratamiento ya fue creado al autorizar un concepto, reintentar no debe crear otro.

## 19. Navegación entre relaciones

Debe existir navegación directa cuando ayude al flujo.

Ejemplos mínimos:
- Paciente → Consulta
- Paciente → Tratamiento
- Paciente → Presupuesto
- Paciente → Pago
- Cita → Paciente
- Cita → Tratamiento
- Cita → Consulta
- Consulta → Paciente
- Consulta → Tratamiento
- Tratamiento → Paciente
- Tratamiento → Presupuesto de origen
- Tratamiento → Consultas
- Presupuesto → Tratamientos generados
- Pago → Paciente
- Pago → Tratamiento cuando aplique
- Movimiento financiero → operación de origen cuando exista

## 20. Alcance actual

Incluye:
- acceso de usuarios definidos;
- Pacientes;
- expediente y archivos;
- Agenda semanal/diaria;
- Citas;
- Consultas;
- Presupuestos;
- PDF de Presupuesto;
- Tratamientos;
- Servicios;
- Pagos;
- Métodos de pago;
- Finanzas simples;
- Categorías financieras;
- Pantalla inicial;
- relaciones navegables;
- responsive;
- PWA instalable cuando sea razonable;
- zona horaria America/Mexico_City.

## 21. Futuro

No incluido actualmente, pero compatible con evolución posterior:
- recordatorios de Citas;
- WhatsApp;
- correo;
- múltiples dentistas;
- permisos diferenciados;
- creación y administración de usuarios adicionales;
- datos institucionales y logo;
- reportes más avanzados;
- facturación electrónica;
- integraciones externas;
- inventario, si vuelve a requerirse.

## 22. Fuera de alcance

Expresamente excluido de esta versión:
- Inventario
- Recordatorios automáticos
- Funcionamiento offline
- Contabilidad formal
- Cuentas por pagar/cobrar formales
- Multi-dentista
- Gestión avanzada de permisos
- Creación de usuarios adicionales
- Contacto de emergencia
- Buscador global
- Porcentaje de avance de Tratamientos
- Drag & drop de Citas
- Pagos desde Presupuestos
- Saldos a favor
- Horario laboral restrictivo
- Integraciones simuladas

## 23. Criterios de aceptación globales

El sistema se considera funcionalmente aceptable cuando:

1. Puede darse de alta un Paciente con nombre y teléfono y usarlo inmediatamente en Agenda.
2. Puede crearse una Cita desde un espacio libre del calendario.
3. No puede guardarse una Cita que se empalme con otra vigente.
4. Puede crearse una Consulta desde una Cita o sin Cita.
5. La Consulta puede registrar varios Servicios y varios Tratamientos.
6. Una Consulta de Tratamiento no genera costo adicional automáticamente.
7. Los archivos de Paciente, Consulta y Tratamiento aparecen en el expediente general conservando su origen.
8. Puede crearse un Presupuesto con varios conceptos y autorizar solo algunos.
9. Autorizar un concepto de tratamiento crea exactamente un Tratamiento Activo independiente.
10. Un Servicio aislado autorizado no genera deuda hasta realizarse.
11. Puede registrarse un abono libre a un Tratamiento sin superar su saldo.
12. Puede pagarse deuda histórica desde la ficha del Paciente.
13. Los pagos se reflejan en Finanzas sin duplicar captura.
14. Los movimientos manuales pueden editarse y eliminarse.
15. Los Tratamientos pueden pasar a Terminado o Cancelado.
16. Un Tratamiento Cancelado deja de formar parte del saldo activo.
17. Un Tratamiento Terminado puede conservar saldo pendiente.
18. Puede generarse y volver a descargar un PDF profesional de Presupuesto.
19. La Agenda es utilizable en vista semanal y diaria.
20. El sistema puede operarse en escritorio, tablet y móvil sin perder funciones esenciales.

## 24. Fases de construcción y validación

Las siguientes fases son obligatoriamente las mismas que aparecen en el Plan de Validación.

### Fase 1 — Núcleo operativo
Pacientes, acceso, Catálogo de Servicios, Categorías financieras y Métodos de pago.

### Fase 2 — Agenda y Consultas
Agenda semanal/diaria, Citas, creación de Consulta desde Cita o directa, Servicios realizados y expediente básico.

### Fase 3 — Presupuestos y Tratamientos
Presupuestos, autorización parcial, generación automática de Tratamientos, frecuencia recomendada, detalle de Tratamiento, PDF y archivos de Tratamiento.

### Fase 4 — Pagos y Finanzas
Pagos, distribución a saldos, deuda histórica, métodos de pago, Ingresos/Egresos, devoluciones, reportes y reglas de coherencia.

### Fase 5 — Integración funcional y cierre
Pantalla inicial, navegación cruzada, estados vacíos/errores, responsive, PWA cuando sea razonable y revisión completa de recorridos extremo a extremo.

## 25. Cierre funcional

Este Discovery define **qué debe hacer** Clínica Dental.

No prescribe arquitectura, tablas, endpoints, frameworks, librerías, componentes internos, mecanismos de autenticación, almacenamiento interno, colas, caché ni estrategia de pruebas.

Cursor conserva libertad técnica para decidir cómo construir el sistema mientras respete íntegramente este comportamiento funcional.

El repositorio operativo de referencia es:

https://github.com/Vector-IA-mx/odontologia
