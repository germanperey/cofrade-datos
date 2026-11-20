import asyncio, json, re, sys
from playwright.async_api import async_playwright
B = "http://127.0.0.1:8787"
res = []
def ok(c, m):
    res.append((bool(c), m)); print(("OK " if c else "FALLA ") + m)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        # 1) Escritorio claro
        cx = await br.new_context(viewport={"width": 1280, "height": 900}, color_scheme="light")
        pg = await cx.new_page()
        await pg.goto(B + "/", wait_until="networkidle")
        sec = pg.locator("#voz")
        ok(await sec.count() == 1, "la portada tiene la sección #voz")
        h2 = (await pg.locator("#t-voz").inner_text()).strip()
        ok(h2 == "El único medio de noticias inclusivo", f"título: {h2}")
        lede = (await pg.locator("#voz .lede").inner_text()).strip()
        ok("no videntes" in lede and "manejando" in lede and "«índice»" in lede, "párrafo con no videntes, manejar e «índice»")
        ok(await pg.locator("#voz .vozp-pasos li").count() == 3, "3 pasos")
        href = await pg.locator("#voz a.btn.oro").get_attribute("href")
        ok(bool(re.fullmatch(r"/edicion/\d{4}-\d{2}-\d{2}\?voz=1", href or "")), f"enlace: {href}")
        # orden: después del héroe y antes de «Doce secciones»
        orden = await pg.evaluate("""() => { const v = document.querySelector('#voz'), s = document.querySelector('#t-secc'), h = document.querySelector('section.lujo');
            return !!(v && s && h && (h.compareDocumentPosition(v) & 4) && (v.compareDocumentPosition(s) & 4)); }""")
        ok(orden, "va entre el héroe y «Doce secciones»")
        # jerarquía de títulos: h1 en el héroe, h2 aquí
        ok(await pg.evaluate("() => document.querySelectorAll('h1').length") == 1, "un solo h1 en la página")
        await sec.screenshot(path="/tmp/titulos/vozp/capturas/escritorio_claro.png")
        # 2) Escritorio oscuro
        cx2 = await br.new_context(viewport={"width": 1280, "height": 900}, color_scheme="dark")
        pg2 = await cx2.new_page(); await pg2.goto(B + "/", wait_until="networkidle")
        fondo = await pg2.evaluate("() => getComputedStyle(document.querySelector('#voz .vozp')).backgroundColor")
        ok(fondo.replace(" ", "") in ("rgb(21,32,51)",), f"fondo oscuro de la tarjeta: {fondo}")
        await pg2.locator("#voz").screenshot(path="/tmp/titulos/vozp/capturas/escritorio_oscuro.png")
        # 3) Celular 360 px y 320 px: sin desborde horizontal
        for w in (360, 320):
            cx3 = await br.new_context(viewport={"width": w, "height": 780}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pg3 = await cx3.new_page(); await pg3.goto(B + "/", wait_until="networkidle")
            ancho = await pg3.evaluate("() => document.documentElement.scrollWidth")
            ok(ancho <= w, f"{w} px: ancho de la página {ancho}")
            caja = await pg3.locator("#voz .vozp").bounding_box()
            ok(caja and caja["x"] >= 0 and caja["x"] + caja["width"] <= w + 0.5, f"{w} px: la tarjeta cabe ({caja and round(caja['width'])} px)")
            btn = await pg3.locator("#voz a.btn.oro").bounding_box()
            ok(btn and btn["height"] >= 44, f"{w} px: botón de {btn and round(btn['height'])} px de alto")
            await pg3.locator("#voz").screenshot(path=f"/tmp/titulos/vozp/capturas/celular_{w}.png")
            await cx3.close()
        # 4) Inglés con el botón EN/ES
        await pg.locator("#idioma").click(); await pg.wait_for_timeout(1500)
        h2e = (await pg.locator("#t-voz").inner_text()).strip()
        ok(h2e == "The only inclusive news outlet", f"título en inglés: {h2e}")
        ledee = (await pg.locator("#voz .lede").inner_text()).strip()
        ok(ledee.startswith("Cofrade News can now be heard in full"), "párrafo en inglés")
        pasos = await pg.locator("#voz .vozp-pasos li").all_inner_texts()
        ok(all(not re.search(r"[áéíóúñ]|Abre |Cuando |Di lo", t) for t in pasos), "pasos en inglés")
        nota = (await pg.locator("#voz .vozp-nota").inner_text()).strip()
        ok(nota.startswith("Free, with nothing to install"), "nota en inglés")
        bt = (await pg.locator("#voz a.btn.oro").inner_text()).strip()
        ok(bt.startswith("Listen to"), f"botón en inglés: {bt}")
        await pg.locator("#voz").screenshot(path="/tmp/titulos/vozp/capturas/escritorio_ingles.png")
        await pg.locator("#idioma").click(); await pg.wait_for_timeout(800)
        # 5) ?voz=1 abre la ventana aunque el lector haya marcado «No volver a mostrar»
        cx4 = await br.new_context(viewport={"width": 1280, "height": 900})
        await cx4.add_init_script("Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>false});try{localStorage.setItem('cn-voz',JSON.stringify({e:'no'}))}catch(e){}")
        pg4 = await cx4.new_page()
        await pg4.goto(B + href, wait_until="networkidle"); await pg4.wait_for_timeout(1500)
        ok(await pg4.locator(".cn-voz-velo").count() == 1, "con ?voz=1 se abre la ventana de la voz")
        foco = await pg4.evaluate("() => document.activeElement && (document.activeElement.className || document.activeElement.tagName)")
        print("   foco en la ventana:", foco)
        await pg4.goto(B + href.split("?")[0], wait_until="networkidle"); await pg4.wait_for_timeout(1500)
        ok(await pg4.locator(".cn-voz-velo").count() == 0, "sin ?voz=1 se respeta «No volver a mostrar»")
        # 6) El primer enlace de la edición es el de la voz (lector de pantalla)
        primero = await pg4.evaluate("() => { const a = document.querySelector('body a, body button'); return a && a.textContent.trim(); }")
        ok(primero == "Escuchar el boletín con voz", f"primer enlace de la edición: {primero}")
        await br.close()
    malos = [m for c, m in res if not c]
    print(f"\nRESULTADO: {len(res) - len(malos)}/{len(res)}")
    sys.exit(1 if malos else 0)
asyncio.run(main())
