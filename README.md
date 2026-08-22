# 🍹 Nuestro Ranking de Tragos

Página web para calificar y guardar sus tragos favoritos, con base de datos
permanente en **Supabase** (gratis) y hosteada en **GitHub Pages**.

## 1. Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea una cuenta gratis.
2. Crea un **New project** (elige cualquier nombre y una contraseña de base de datos).
3. Cuando el proyecto esté listo, ve a **SQL Editor** (menú izquierdo) y pega esto para crear la tabla:

```sql
create table tragos (
  id bigint generated always as identity primary key,
  nombre text not null,
  descripcion text,
  puntuacion_general numeric not null,
  puntuacion_sabor numeric not null,
  puntuacion_pega numeric not null,
  comentarios text,
  foto_url text,
  created_at timestamp with time zone default now()
);

alter table tragos enable row level security;

create policy "Lectura publica" on tragos for select using (true);
create policy "Insertar publico" on tragos for insert with check (true);
create policy "Actualizar publico" on tragos for update using (true);
create policy "Eliminar publico" on tragos for delete using (true);
```

   Presiona **Run**.

   > Nota: estas políticas dejan la tabla abierta a quien tenga el link de la
   > página (útil para uso privado entre pocas personas). Si más adelante
   > quieres protegerla con usuario/contraseña, se puede agregar Supabase Auth.

4. Ve a **Storage** (menú izquierdo) → **New bucket** → nómbralo exactamente
   `fotos-tragos` → márcalo como **Public bucket** → Create bucket.

5. Ve a **Project Settings** (ícono de engranaje) → **API**. Copia:
   - **Project URL**
   - **anon public key**

## 2. Configurar la página

Abre el archivo `config.js` y reemplaza:

```js
const SUPABASE_URL = "PEGA_AQUI_TU_PROJECT_URL";
const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_KEY";
```

con los valores que copiaste.

## 3. Subir a GitHub y activar GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público o privado).
2. Sube estos 4 archivos: `index.html`, `app.js`, `config.js`, `README.md`.
3. Ve a **Settings → Pages** en el repositorio.
4. En "Source" elige la rama `main` y la carpeta `/root`, guarda.
5. En un par de minutos tu página estará disponible en:
   `https://tu-usuario.github.io/nombre-repo/`

## 4. Usar la página

- Botón **+ Agregar Trago**: abre un formulario para nombre, puntuaciones,
  comentarios y una foto (se sube directo a Supabase Storage).
- Ícono ✏️: edita un trago existente.
- Ícono 🗑️: lo elimina (pide confirmación).
- El ranking se ordena automáticamente por puntuación general, de mayor a menor.
- Todo lo que agreguen queda guardado en la base de datos: si abren la
  página desde otro celular o computadora con el mismo link, verán los
  mismos datos.

## ¿Por qué Supabase?

GitHub Pages solo sirve archivos estáticos (no puede guardar datos por sí
solo). Supabase da gratis una base de datos Postgres + almacenamiento de
imágenes con una API lista para usar desde el navegador, sin necesidad de
programar un backend aparte. El plan gratuito es más que suficiente para
este uso.
