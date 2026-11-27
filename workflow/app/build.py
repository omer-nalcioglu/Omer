# Prototipi tek dosyada birleştirir: python3 workflow/app/build.py
# core.js = workflow-app/packages/core motorunun tarayıcı paketi (esbuild ile üretilir).
import pathlib
d = pathlib.Path(__file__).parent
html = (d / "shell.html").read_text()
html = html.replace("/*CSS*/", (d / "style.css").read_text())
html = html.replace("/*CORE*/", (d / "core.js").read_text())
html = html.replace("/*APP*/", "\n".join(p.read_text() for p in sorted((d / "js").glob("*.js"))))
(d.parent / "app.html").write_text(html)
print("workflow/app.html", len(html.encode()), "bayt")
