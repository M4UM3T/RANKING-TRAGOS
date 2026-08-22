🍹 Nuestro Ranking de Tragos

Página web para calificar y guardar sus tragos favoritos, con base de datos permanente en Supabase (gratis) y hosteada en GitHub Pages.

⚠️ Actualización: nuevo diseño de la página de Ranking de Tragos

Se rediseñó ranking.html (tarjetas con categoría, subidón, resaca, ubicación, notas de Él/Ella, veredicto final y una galería de "Momentos"). Este diseño usa columnas nuevas que no existen todavía en tu tabla tragos de Supabase.

Antes de subir los archivos nuevos, ve a tu proyecto de Supabase → SQL Editor → pega esto y presiona Run:

sql
alter table tragos add column if not exists categoria text default 'otro';
alter table tragos add column if not exists puntuacion_subidon numeric;
alter table tragos add column if not exists puntuacion_resaca numeric;
alter table tragos add column if not exists ubicacion text;
alter table tragos add column if not exists nota_el text;
alter table tragos add column if not exists nota_ella text;
alter table tragos add column if not exists veredicto text;
alter table tragos add column if not exists fotos_momentos text[] default '{}';

Notas sobre estas columnas:

categoria: uno de cerveza, coctel, vino, ron, tequila, otro.
veredicto: uno de repetir, otra_vez, tal_vez, no_volver (o vacío).
fotos_momentos: una lista de URLs de fotos (arreglo de texto). Se suben al mismo bucket fotos-tragos que ya tienes creado, así que no necesitas nada adicional en Storage.
Los tragos que ya tenías seguirán funcionando: las columnas nuevas simplemente quedan vacías hasta que edites cada trago y les agregues esos datos.
Las columnas antiguas descripcion, comentarios, puntuacion_pega y foto_referencia_url siguen existiendo en la tabla pero ya no se usan en el nuevo diseño (no hace falta borrarlas).
1. Crear el proyecto en Supabase
Entra a https://supabase.com y crea una cuenta gratis.
Crea un New project (elige cualquier nombre y una contraseña de base de datos).
Cuando el proyecto esté listo, ve a SQL Editor (menú izquierdo) y pega esto para crear la tabla:
sql
create table tragos (
  id bigint generated always as identity primary key,
  nombre text not null,
  categoria text default 'otro',
  puntuacion_general numeric not null,
  puntuacion_sabor numeric not null,
  puntuacion_subidon numeric,
  puntuacion_resaca numeric,
  ubicacion text,
  nota_el text,
  nota_ella text,
  veredicto text,
  foto_url text,
  fotos_momentos text[] default '{}',
  created_at timestamp with time zone default now()
);

alter table tragos enable row level security;

create policy "Lectura publica" on tragos for select using (true);
create policy "Insertar publico" on tragos for insert with check (true);
create policy "Actualizar publico" on tragos for update using (true);
create policy "Eliminar publico" on tragos for delete using (true);

Presiona Run.

Nota: estas políticas dejan la tabla abierta a quien tenga el link de la página (útil para uso privado entre pocas personas). Si más adelante quieres protegerla con usuario/contraseña, se puede agregar Supabase Auth.

Si ya tenías la tabla creada de antes, usa en su lugar el bloque de alter table de la sección de arriba ("Actualización: nuevo diseño").

Ve a Storage (menú izquierdo) → New bucket → nómbralo exactamente fotos-tragos → márcalo como Public bucket → Create bucket.
Ve a Project Settings (ícono de engranaje) → API. Copia:
Project URL
anon public key
2. Configurar la página

Abre el archivo config.js y reemplaza:

js
const SUPABASE_URL = "PEGA_AQUI_TU_PROJECT_URL";
const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_KEY";

con los valores que copiaste.

3. Subir a GitHub y activar GitHub Pages
Crea un repositorio nuevo en GitHub (puede ser público o privado).
Sube los archivos del proyecto (index.html, ranking.html, app.js, peliculas.html, peliculas-app.js, config.js, README.md).
Ve a Settings → Pages en el repositorio.
En "Source" elige la rama main y la carpeta /root, guarda.
En un par de minutos tu página estará disponible en: https://tu-usuario.github.io/nombre-repo/
4. Usar la página de Ranking de Tragos
Filtra por categoría con los botones de arriba, o presiona 🎲 Trago Aleatorio para que la página resalte uno al azar.
Botón + Agregar Trago: abre un formulario con nombre, categoría, calificaciones (general, sabor, subidón, resaca), ubicación, notas de Él y Ella, veredicto final, una foto principal y varias fotos de "Momentos".
Ícono ✏️ en cada tarjeta: edita ese trago.
Ícono 🗑️: lo elimina (pide confirmación).
El ranking se ordena automáticamente por puntuación general, de mayor a menor.
Todo lo que agreguen queda guardado en la base de datos: si abren la página desde otro celular o computadora con el mismo link, verán los mismos datos.
¿Por qué Supabase?

GitHub Pages solo sirve archivos estáticos (no puede guardar datos por sí solo). Supabase da gratis una base de datos Postgres + almacenamiento de imágenes con una API lista para usar desde el navegador, sin necesidad de programar un backend aparte. El plan gratuito es más que suficiente para este uso.
