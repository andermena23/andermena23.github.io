# Spec: web de CV para desarrollador full stack (GitHub Pages)

## 1. Decisiones cerradas
| Tema | Decisión |
|---|---|
| Objetivo | CV online: formación, experiencia, habilidades, idiomas y contacto |
| Arquitectura | Una sola página con datos en JSON, sin build ni dependencias |
| Idiomas | ES/EN, con selector y PDF de descarga por idioma |
| Foto | Placeholder con la foto de GitHub (`https://github.com/andermena23.png`) |
| Contacto | Email, GitHub (`andermena23`) y LinkedIn (placeholder hasta que exista). Sin teléfono |
| Contenido | Formación real (ver §2); experiencia y resto con datos de ejemplo hasta tener CV |
| Estilo | Minimalista, moderno, poco color, design system definido, temática dev |
| Acento | Rosa/fucsia |

## 2. Contenido y estructura
Cabecera (foto, nombre, titular, ubicación, botones) → Perfil → Experiencia → Formación → Habilidades → Idiomas → Certificaciones (opcional) → Contacto.

**Datos reales conocidos**
- Formación: estudiante de Informática en la EHU/UPV, rama de Ingeniería del Software.
- Titular propuesto: "Full Stack Developer en formación" / "Full Stack Developer in training".
- GitHub: `andermena23`.

Los datos viven en `data/cv.es.json` y `data/cv.en.json`, con el mismo esquema:

```json
{
  "ui": { "skip": "", "photoAlt": "", "download": "", "switchLang": "", "toggleTheme": "", "sections": {} },
  "meta": { "name": "", "title": "", "location": "", "summary": "", "cv": "" },
  "contact": { "email": "", "github": "", "linkedin": "" },
  "experience": [{ "role": "", "company": "", "start": "", "end": "", "bullets": [] }],
  "education": [{ "degree": "", "school": "", "start": "", "end": "", "note": "" }],
  "skills": [{ "group": "", "items": [] }],
  "languages": [{ "name": "", "level": "" }],
  "certifications": [{ "name": "", "issuer": "", "year": "" }]
}
```

`ui` contiene los textos de interfaz de cada idioma y `meta.cv` la ruta del PDF (vacío = el botón de descarga no se muestra).

Las secciones sin datos (por ejemplo `experience` o `certifications` vacíos) no se renderizan. Así se puede publicar antes de tener el CV completo.

## 3. Design system

**Principios:** una sola decisión visual por elemento, jerarquía por tamaño y peso (no por color), movimiento mínimo.

**Color (tokens CSS).** Neutros más un único acento fucsia. El modo oscuro es el predeterminado y se respeta `prefers-color-scheme`.

| Token | Claro | Oscuro |
|---|---|---|
| `--bg` | `#FAFAFA` | `#0B0D10` |
| `--surface` | `#FFFFFF` | `#12151A` |
| `--border` | `#E4E4E7` | `#222831` |
| `--text` | `#18181B` | `#E6E8EB` |
| `--text-muted` | `#52525B` | `#8B93A0` |
| `--accent` | `#A21CAF` | `#E879F9` |

El acento se usa solo en enlaces, estado `:focus` y detalles puntuales. Todos los pares texto/fondo deben cumplir contraste AA (a verificar al implementar).

**Tipografía.**
- **Inter** para texto y títulos.
- **JetBrains Mono** para fechas, etiquetas de habilidades y detalles técnicos (único guiño dev).
- Escala: 14 / 16 / 20 / 28 / 40 px. Interlineado 1.6 en texto, 1.2 en títulos.
- Fuentes alojadas en el propio repo (sin Google Fonts).

**Espaciado y forma.**
- Escala base de 4px: 4, 8, 12, 16, 24, 32, 48, 64.
- Radio único de 8px. Bordes de 1px, sin sombras.
- Ancho máximo de contenido ~720px.

**Componentes.** Botón (primario sólido y secundario con borde), chip de habilidad (mono, borde), item de línea de tiempo (experiencia y formación), selector de idioma/tema, enlace con subrayado en hover.

**Movimiento.** Transiciones de 150ms solo en color y borde; desactivadas con `prefers-reduced-motion`.

Todo se declara en `css/tokens.css`; `styles.css` solo consume esas variables.

## 4. Estructura de archivos
```
/
├── index.html
├── css/ tokens.css · styles.css · print.css
├── js/main.js              # render JSON, i18n, tema
├── data/ cv.es.json · cv.en.json
├── assets/ fonts/ · img/ · cv-es.pdf · cv-en.pdf
├── favicon.svg · 404.html · robots.txt
```

## 5. Comportamiento
- Idioma por defecto desde `navigator.language` (ES como fallback), guardado en `localStorage` y reflejado en `<html lang>`. El enlace de descarga cambia con el idioma.
- Tema: sigue al sistema, con toggle manual guardado.
- `print.css` genera un A4 limpio (sin navegación ni botones), válido como PDF alternativo.
- El email se monta con JS para reducir el scraping.

## 6. Requisitos no funcionales
- Lighthouse ≥ 95 en las cuatro categorías.
- HTML semántico, navegación por teclado y contraste AA.
- Meta tags por idioma, Open Graph y JSON-LD `Person`.
- Sin cookies ni trackers.

## 7. Despliegue
Repo `andermena23.github.io` con Pages desde `main`, HTTPS forzado, y `CNAME` cuando haya dominio. Los PDFs se regeneran y se commitean cuando cambie el CV.

## 8. Criterios de aceptación
- [ ] Contenido en ES y EN con el mismo esquema, secciones vacías ocultas.
- [ ] El selector de idioma persiste y cambia el PDF.
- [ ] Modo claro y oscuro correctos, sin parpadeo al cargar.
- [ ] Todos los colores y espaciados salen de tokens (sin valores sueltos).
- [ ] Responsive de 320px a 1920px.
- [ ] Impresión en A4 limpia.
- [ ] Lighthouse ≥ 95 y publicada por HTTPS.

## 9. Plan
1. **Base:** `tokens.css`, estructura HTML y datos de ejemplo.
2. **Render e i18n:** JSON → DOM, selector de idioma y tema.
3. **Pulido:** componentes, responsive, print, accesibilidad y SEO.
4. **Publicación:** PDFs, pruebas con Lighthouse y despliegue.

## 10. Pendiente
- Nombre completo a mostrar y email de contacto.
- Perfil de LinkedIn (cuando exista).
- Contenido real: años cursados, habilidades, idiomas, proyectos o experiencia.
- Dominio propio (opcional).
