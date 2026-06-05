from __future__ import annotations

import json
from pathlib import Path
from textwrap import dedent


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT / "outputs" / "manual-20260523-final-ppt" / "presentations" / "forge-core-final"
SLIDES = WORKSPACE / "slides"
PREVIEW = WORKSPACE / "preview"
LAYOUT = WORKSPACE / "layout"
ASSETS = WORKSPACE / "assets"
QA = WORKSPACE / "qa"
OUTPUT = ROOT / "docs"
FINAL = OUTPUT / "FORGE_CORE_Presentacion_Final_10_Diapositivas.pptx"

for folder in [SLIDES, PREVIEW, LAYOUT, ASSETS, QA, OUTPUT]:
    folder.mkdir(parents=True, exist_ok=True)


def js_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "/")


assets = {
    "home": js_path(ROOT / "outputs" / "proposed-home.png"),
    "community": js_path(ROOT / "outputs" / "proposed-community-persistent.png"),
    "arch": js_path(ROOT / "docs" / "figures" / "final_arquitectura_aws.png"),
    "er": js_path(ROOT / "docs" / "figures" / "final_modelo_datos.png"),
    "checkout": js_path(ROOT / "docs" / "figures" / "final_checkout.png"),
    "metrics": js_path(ROOT / "docs" / "figures" / "final_metricas.png"),
    "deploy": js_path(ROOT / "docs" / "figures" / "final_despliegue.png"),
    "rtx": js_path(ROOT / "frontend" / "public" / "assets" / "products" / "rtx-4090-ultra.jpg"),
    "ram": js_path(ROOT / "frontend" / "public" / "assets" / "products" / "venom-rgb-64gb.jpg"),
    "cpu": js_path(ROOT / "frontend" / "public" / "assets" / "products" / "ryzen-9-forge.jpg"),
    "ssd": js_path(ROOT / "frontend" / "public" / "assets" / "products" / "nova-ssd-4tb.jpg"),
    "psu": js_path(ROOT / "frontend" / "public" / "assets" / "products" / "titan-psu-1000w.jpg"),
}

(WORKSPACE / "profile-plan.txt").write_text(
    dedent(
        """
        task mode: create
        primary deck-profile: engineering-platform
        secondary gates: consumer-retail/product visuals, academic project defense
        required proof objects: AWS architecture, technology stack, real UI screenshots, database model, checkout transaction flow, OS metrics, test results
        source/asset requirements: use local project screenshots and generated product images from the implemented ecommerce
        brand constraints: do not fabricate external brand marks; use FORGE CORE visual language only
        QA gates: max 10 slides, clear story spine, readable screenshots, no filler, each slide has a defensible claim
        """
    ).strip()
    + "\n",
    encoding="utf-8",
)

(SLIDES / "shared.mjs").write_text(
    dedent(
        f"""
        export const A = {json.dumps(assets, ensure_ascii=False, indent=2)};
        export const C = {{
          bg: "#080B10",
          panel: "#10151F",
          panel2: "#171D28",
          ink: "#F6F8FB",
          muted: "#AAB4C1",
          cyan: "#5DE7F3",
          cyan2: "#91F4FF",
          lime: "#A7F36B",
          amber: "#F5C451",
          red: "#FB7185",
          line: "#2B3647"
        }};

        export function bg(slide, ctx, eyebrow = "FORGE CORE | PC Hardware Hub") {{
          ctx.addShape(slide, {{ x: 0, y: 0, w: 1280, h: 720, fill: C.bg }});
          ctx.addShape(slide, {{ x: 0, y: 0, w: 1280, h: 720, fill: "#111827" }});
          ctx.addShape(slide, {{ x: 0, y: 0, w: 1280, h: 58, fill: "#05070B" }});
          ctx.addShape(slide, {{ x: 0, y: 716, w: 1280, h: 4, fill: C.cyan }});
          ctx.addText(slide, {{ text: eyebrow, x: 54, y: 26, w: 620, h: 24, fontSize: 13, color: C.cyan2, bold: true, insets: {{ left: 0, right: 0, top: 0, bottom: 0 }} }});
        }}

        export function footer(slide, ctx, n) {{
          ctx.addText(slide, {{ text: `Sistemas Operativos · AWS · React · Node · MariaDB · ${{String(n).padStart(2, "0")}}/10`, x: 54, y: 680, w: 660, h: 20, fontSize: 11, color: "#7E8A9A" }});
        }}

        export function title(slide, ctx, text, subtitle = "") {{
          ctx.addText(slide, {{ text, x: 54, y: 76, w: 760, h: 86, fontSize: 36, color: C.ink, bold: true, typeface: ctx.fonts.title, insets: {{ left: 0, right: 0, top: 0, bottom: 0 }} }});
          if (subtitle) ctx.addText(slide, {{ text: subtitle, x: 56, y: 172, w: 720, h: 34, fontSize: 16, color: C.muted, insets: {{ left: 0, right: 0, top: 0, bottom: 0 }} }});
        }}

        export function card(slide, ctx, x, y, w, h, fill = C.panel, line = C.line) {{
          ctx.addShape(slide, {{ x, y, w, h, fill, line: ctx.line(line, 1) }});
        }}

        export function label(slide, ctx, text, x, y, w, color = C.cyan) {{
          ctx.addText(slide, {{ text, x, y, w, h: 22, fontSize: 12, color, bold: true, insets: {{ left: 0, right: 0, top: 0, bottom: 0 }} }});
        }}

        export function body(slide, ctx, text, x, y, w, h, size = 18, color = C.ink) {{
          ctx.addText(slide, {{ text, x, y, w, h, fontSize: size, color, insets: {{ left: 8, right: 8, top: 6, bottom: 6 }} }});
        }}

        export function stat(slide, ctx, value, labelText, x, y, w, color = C.cyan) {{
          card(slide, ctx, x, y, w, 96, "#0E1420", "#253145");
          ctx.addText(slide, {{ text: value, x: x + 18, y: y + 16, w: w - 36, h: 34, fontSize: 28, color, bold: true }});
          ctx.addText(slide, {{ text: labelText, x: x + 18, y: y + 55, w: w - 36, h: 32, fontSize: 12, color: C.muted }});
        }}

        export async function screenshot(slide, ctx, path, x, y, w, h, fit = "cover") {{
          card(slide, ctx, x - 4, y - 4, w + 8, h + 8, "#05070B", "#26364D");
          await ctx.addImage(slide, {{ path, x, y, w, h, fit, alt: "Captura real del ecommerce FORGE CORE" }});
        }}

        export function bullet(slide, ctx, items, x, y, w, gap = 43) {{
          items.forEach((item, i) => {{
            const yy = y + i * gap;
            ctx.addShape(slide, {{ x, y: yy + 7, w: 10, h: 10, fill: C.cyan }});
            ctx.addText(slide, {{ text: item, x: x + 24, y: yy, w, h: 34, fontSize: 17, color: C.ink, insets: {{ left: 0, right: 0, top: 0, bottom: 0 }} }});
          }});
        }}
        """
    ).strip()
    + "\n",
    encoding="utf-8",
)


slides = {
    "slide-01.mjs": """
        import { A, C, bg, footer, screenshot, stat } from "./shared.mjs";
        export async function slide01(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "PROYECTO FINAL · SISTEMAS OPERATIVOS");
          ctx.addText(slide, { text: "FORGE CORE", x: 54, y: 92, w: 560, h: 70, fontSize: 56, color: C.ink, bold: true, typeface: ctx.fonts.title });
          ctx.addText(slide, { text: "E-commerce ficticio de hardware desplegado en AWS", x: 58, y: 170, w: 590, h: 54, fontSize: 20, color: C.muted });
          ctx.addText(slide, { text: "React + TypeScript + Tailwind · Node.js + Express · MariaDB · Nginx · systemd · EC2", x: 58, y: 240, w: 600, h: 44, fontSize: 15, color: C.cyan2 });
          await screenshot(slide, ctx, A.home, 690, 100, 520, 310, "cover");
          stat(slide, ctx, "2 EC2", "App Server + Database Server", 58, 390, 170, C.cyan);
          stat(slide, ctx, "57+", "productos en catalogo", 250, 390, 170, C.lime);
          stat(slide, ctx, "REST API", "catalogo, pedidos, comunidad", 442, 390, 210, C.amber);
          footer(slide, ctx, 1);
          return slide;
        }
    """,
    "slide-02.mjs": """
        import { C, bg, title, footer, bullet, stat } from "./shared.mjs";
        export async function slide02(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx);
          title(slide, ctx, "El reto no era solo diseñar una tienda", "El proyecto demuestra infraestructura, persistencia, seguridad y conceptos de Sistemas Operativos.");
          bullet(slide, ctx, [
            "Evitar una maqueta estatica: los productos, pedidos y comentarios salen de MariaDB.",
            "Separar responsabilidades: una EC2 publica para app y una EC2 privada para base de datos.",
            "Controlar inventario con transacciones para evitar descuentos inconsistentes.",
            "Mostrar metricas reales del servidor usando procesos, worker thread y Linux."
          ], 70, 245, 590, 52);
          stat(slide, ctx, "Frontend", "SPA React con catalogo, carrito, comunidad y admin", 730, 230, 360, C.cyan);
          stat(slide, ctx, "Backend", "API REST con Express y mysql2", 730, 350, 360, C.lime);
          stat(slide, ctx, "BD", "MariaDB con procedures y auditoria de stock", 730, 470, 360, C.amber);
          footer(slide, ctx, 2);
          return slide;
        }
    """,
    "slide-03.mjs": """
        import { A, C, bg, title, footer, screenshot } from "./shared.mjs";
        export async function slide03(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "ARQUITECTURA CLOUD");
          title(slide, ctx, "Arquitectura AWS de dos servidores", "Usuario -> EC2 App Server -> EC2 Database Server por IP privada.");
          await screenshot(slide, ctx, A.arch, 90, 215, 830, 385, "contain");
          ctx.addText(slide, { text: "Seguridad clave", x: 970, y: 230, w: 210, h: 28, fontSize: 20, color: C.cyan, bold: true });
          ctx.addText(slide, { text: "• Puerto 80 publico solo en App Server\\n• Puerto 3306 permitido solo desde forge-app-sg\\n• Backend usa DB_HOST con IP privada\\n• Nginx sirve React y proxya /api", x: 970, y: 278, w: 235, h: 210, fontSize: 17, color: C.ink });
          footer(slide, ctx, 3);
          return slide;
        }
    """,
    "slide-04.mjs": """
        import { C, bg, title, footer, card, label } from "./shared.mjs";
        export async function slide04(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "TECNOLOGIAS IMPLEMENTADAS");
          title(slide, ctx, "Stack por capas del proyecto", "Cada tecnologia cumple un rol concreto dentro de la solucion.");
          const rows = [
            ["Frontend", "React · TypeScript · Tailwind · Vite · lucide-react", "Interfaz SPA, catalogo, carrito, comunidad, admin y build estatico."],
            ["Backend", "Node.js · Express · mysql2 · dotenv · cors", "API REST, validacion, conexion MariaDB, pedidos y endpoints admin."],
            ["Base de datos", "MariaDB · SQL · Stored Procedures", "Productos, pedidos, inventario, comentarios, metricas y transacciones."],
            ["Despliegue", "AWS EC2 · Ubuntu · Nginx · systemd · Security Groups", "Publicacion web, servicio persistente, proxy /api y seguridad de puertos."]
          ];
          rows.forEach((r, i) => {
            const y = 220 + i * 94;
            card(slide, ctx, 72, y, 1136, 72, i % 2 ? "#101722" : "#0D131D", "#253145");
            label(slide, ctx, r[0], 100, y + 16, 160, i === 0 ? C.cyan : i === 1 ? C.lime : i === 2 ? C.amber : C.red);
            ctx.addText(slide, { text: r[1], x: 300, y: y + 14, w: 360, h: 26, fontSize: 17, color: C.ink, bold: true });
            ctx.addText(slide, { text: r[2], x: 690, y: y + 14, w: 470, h: 44, fontSize: 15, color: C.muted });
          });
          footer(slide, ctx, 4);
          return slide;
        }
    """,
    "slide-05.mjs": """
        import { A, C, bg, title, footer, screenshot } from "./shared.mjs";
        export async function slide05(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "EXPERIENCIA VISUAL");
          title(slide, ctx, "E-commerce real: hero, catalogo y producto destacado", "La interfaz usa capturas reales de la aplicacion construida.");
          await screenshot(slide, ctx, A.home, 62, 225, 700, 370, "cover");
          await screenshot(slide, ctx, A.rtx, 810, 225, 185, 132, "cover");
          await screenshot(slide, ctx, A.cpu, 1015, 225, 185, 132, "cover");
          await screenshot(slide, ctx, A.ram, 810, 388, 185, 132, "cover");
          await screenshot(slide, ctx, A.ssd, 1015, 388, 185, 132, "cover");
          ctx.addText(slide, { text: "Imagenes de productos + UI premium gaming", x: 812, y: 555, w: 380, h: 30, fontSize: 18, color: C.cyan, bold: true });
          footer(slide, ctx, 5);
          return slide;
        }
    """,
    "slide-06.mjs": """
        import { A, C, bg, title, footer, screenshot } from "./shared.mjs";
        export async function slide06(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "CHECKOUT E INVENTARIO");
          title(slide, ctx, "El pago simulado descuenta stock con transaccion", "La compra no es decorativa: el backend llama un stored procedure en MariaDB.");
          await screenshot(slide, ctx, A.checkout, 76, 215, 785, 375, "contain");
          ctx.addText(slide, { text: "Stored procedure clave", x: 925, y: 232, w: 260, h: 28, fontSize: 20, color: C.cyan, bold: true });
          ctx.addText(slide, { text: "sp_create_simulated_order\\n\\n1. Valida items\\n2. Bloquea filas con SELECT ... FOR UPDATE\\n3. Inserta order + order_items\\n4. Descuenta stock\\n5. Registra inventory_movements", x: 925, y: 280, w: 280, h: 260, fontSize: 17, color: C.ink });
          footer(slide, ctx, 6);
          return slide;
        }
    """,
    "slide-07.mjs": """
        import { A, C, bg, title, footer, screenshot } from "./shared.mjs";
        export async function slide07(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "BASE DE DATOS");
          title(slide, ctx, "MariaDB guarda todo lo que hace viva a la tienda", "Catalogo, pedidos, movimientos, metricas y comentarios quedan persistidos.");
          await screenshot(slide, ctx, A.er, 70, 208, 760, 390, "contain");
          const items = ["products", "orders / order_items", "inventory_movements", "system_metrics", "buyer_messages"];
          items.forEach((item, i) => {
            ctx.addShape(slide, { x: 900, y: 220 + i * 62, w: 250, h: 38, fill: "#0E1420", line: ctx.line("#26364D", 1) });
            ctx.addText(slide, { text: item, x: 920, y: 229 + i * 62, w: 215, h: 22, fontSize: 17, color: i === 0 ? C.cyan : C.ink, bold: i === 0 });
          });
          footer(slide, ctx, 7);
          return slide;
        }
    """,
    "slide-08.mjs": """
        import { A, C, bg, title, footer, screenshot, stat } from "./shared.mjs";
        export async function slide08(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "SISTEMAS OPERATIVOS");
          title(slide, ctx, "Conceptos de SO aplicados en una demo funcional", "El dashboard conecta la app con recursos reales del servidor Linux.");
          await screenshot(slide, ctx, A.metrics, 72, 230, 590, 300, "contain");
          stat(slide, ctx, "worker_threads", "concurrencia para metricas", 720, 220, 350, C.cyan);
          stat(slide, ctx, "/proc + os + df", "lectura del sistema Linux", 720, 340, 350, C.lime);
          stat(slide, ctx, "systemd", "backend como servicio persistente", 720, 460, 350, C.amber);
          footer(slide, ctx, 8);
          return slide;
        }
    """,
    "slide-09.mjs": """
        import { A, C, bg, title, footer, screenshot, stat } from "./shared.mjs";
        export async function slide09(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "PRUEBAS Y RESULTADOS");
          title(slide, ctx, "Resultado: aplicacion desplegada, consultable y persistente", "La demo valida frontend, API, BD, seguridad y comportamiento de usuario.");
          await screenshot(slide, ctx, A.community, 66, 210, 590, 365, "cover");
          stat(slide, ctx, "OK", "/api/health: database online", 720, 210, 360, C.lime);
          stat(slide, ctx, "OK", "comentarios guardados en buyer_messages", 720, 330, 360, C.cyan);
          stat(slide, ctx, "OK", "catalogo con productos reales e imagenes", 720, 450, 360, C.amber);
          ctx.addText(slide, { text: "La seccion Comunidad permite que el profesor escriba un mensaje y luego recargue: el dato permanece porque vive en MariaDB.", x: 720, y: 575, w: 420, h: 50, fontSize: 15, color: C.muted });
          footer(slide, ctx, 9);
          return slide;
        }
    """,
    "slide-10.mjs": """
        import { C, bg, title, footer, card } from "./shared.mjs";
        export async function slide10(presentation, ctx) {
          const slide = presentation.slides.add();
          bg(slide, ctx, "CIERRE");
          title(slide, ctx, "FORGE CORE demuestra una tienda cloud de extremo a extremo", "La entrega conecta experiencia visual, backend, base de datos e infraestructura Linux.");
          const cols = [
            ["Lo implementado", "SPA profesional\\nAPI REST\\nMariaDB separada\\nCheckout transaccional\\nComunidad persistente"],
            ["Lo aprendido", "Procesos y systemd\\nConcurrencia con worker\\nLectura de recursos Linux\\nSeguridad de puertos\\nTransacciones SQL"],
            ["Siguiente mejora", "Autenticacion admin\\nDominio + HTTPS\\nBackups MariaDB\\nCI/CD\\nPruebas de concurrencia"]
          ];
          cols.forEach((c, i) => {
            const x = 82 + i * 390;
            card(slide, ctx, x, 245, 330, 285, "#0E1420", "#26364D");
            ctx.addText(slide, { text: c[0], x: x + 26, y: 275, w: 270, h: 30, fontSize: 22, color: i === 0 ? C.cyan : i === 1 ? C.lime : C.amber, bold: true });
            ctx.addText(slide, { text: c[1], x: x + 28, y: 330, w: 270, h: 150, fontSize: 18, color: C.ink });
          });
          ctx.addText(slide, { text: "Demo lista para exposicion: Usuario -> EC2 App Server -> EC2 Database Server", x: 250, y: 590, w: 780, h: 34, fontSize: 20, color: C.cyan2, bold: true, align: "center" });
          footer(slide, ctx, 10);
          return slide;
        }
    """,
}

for name, content in slides.items():
    (SLIDES / name).write_text(dedent(content).strip() + "\n", encoding="utf-8")

print(json.dumps({
    "workspace": js_path(WORKSPACE),
    "slides": js_path(SLIDES),
    "preview": js_path(PREVIEW),
    "layout": js_path(LAYOUT),
    "final": js_path(FINAL),
}, indent=2))
