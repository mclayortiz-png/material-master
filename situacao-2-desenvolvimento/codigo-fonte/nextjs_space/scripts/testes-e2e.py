import asyncio, sys, os
from playwright.async_api import async_playwright
BASE=os.environ.get('TEST_BASE','http://localhost:3000')
# Senhas das contas de demonstração (mesmas variáveis do seed; padrões apenas para desenvolvimento).
SENHA_ADMIN=os.environ.get('SEED_SENHA_ADMIN','Admin@123')
SENHA_GESTOR=os.environ.get('SEED_SENHA_GESTOR','Gestor@123')
SENHA_CONSULTA=os.environ.get('SEED_SENHA_CONSULTA','Consulta@123')
# Pasta das capturas de tela (relativa ao diretório atual, ignorada pelo .gitignore).
SCREENS=os.environ.get('E2E_SCREENSHOTS','e2e-screens'); os.makedirs(SCREENS, exist_ok=True)
results=[]
async def check(name, coro):
    try:
        await coro; results.append(('PASS',name,''))
    except Exception as e:
        results.append(('FAIL',name,str(e)[:300]))
async def login(ctx, email, pwd):
    p = await ctx.new_page()
    await p.goto(BASE+'/login')
    await p.fill('input[type=email]', email)
    await p.fill('input[type=password]', pwd)
    await p.click('button[type=submit]')
    await p.wait_for_url('**/inicio', timeout=45000)
    return p
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        # --- Admin flows
        ctx = await b.new_context(viewport={'width':1280,'height':800})
        async def t_login_admin():
            global pa; pa = await login(ctx,'admin@materialmaster.com.br',SENHA_ADMIN)
            assert 'Ana' in await pa.content()
        await check('Login admin -> /inicio', t_login_admin())
        async def t_list():
            await pa.goto(BASE+'/materiais'); await pa.wait_for_selector('text=MAT-')
            await pa.fill('input[placeholder*="Buscar"], input[type=search], input[name=q]', 'cabo')
            await pa.wait_for_timeout(1200)
            c = await pa.content(); assert 'abo' in c.lower()
        await check('Listar e buscar materiais', t_list())
        async def t_create():
            await pa.goto(BASE+'/materiais/novo')
            await pa.wait_for_selector('form')
            await pa.click('button[type=submit]')
            await pa.wait_for_timeout(800)
            c = await pa.content(); assert 'obrigat' in c.lower(), 'sem mensagem de validação'
            await pa.fill('input#descricaoCurta', 'Material E2E Teste Playwright')
            await pa.fill('#descricaoLonga', 'Descrição técnica longa criada pelo teste e2e')
            await pa.select_option('#unidadeMedidaId', index=1)
            await pa.select_option('#familiaId', label=[o for o in await pa.locator('#familiaId option').all_inner_texts() if 'ELE' in o][0])
            await pa.wait_for_timeout(500)
            await pa.select_option('#grupoId', index=1)
            await pa.wait_for_timeout(500)
            await pa.select_option('#subgrupoId', index=1)
            await pa.fill('#fabricante', 'Fabricante E2E')
            await pa.click('button[type=submit]')
            await pa.wait_for_url(lambda u: '/materiais/' in u and not u.endswith('/novo'), timeout=15000)
            await pa.wait_for_timeout(800)
            c = await pa.content(); assert 'MAT-' in c and 'Material E2E' in c
            global url_mat; url_mat = pa.url
        await check('Criar material via formulário (validação + cascata + código gerado)', t_create())
        async def t_edit():
            await pa.goto(url_mat+'/editar'); await pa.wait_for_selector('form')
            assert await pa.locator('input#descricaoCurta').input_value() != ''
            await pa.fill('input#descricaoCurta', 'Material E2E Editado')
            await pa.click('button[type=submit]')
            await pa.wait_for_url(url_mat, timeout=15000)
            await pa.wait_for_timeout(500)
            c = await pa.content(); assert 'Material E2E Editado' in c and ('Edição' in c or 'EDICAO' in c)
        await check('Editar material e ver histórico', t_edit())
        async def t_inativar():
            await pa.goto(url_mat)
            await pa.click('button:has-text("Inativar")')
            await pa.fill('#motivo', 'Motivo do teste e2e')
            await pa.click('[role=alertdialog] button:has-text("Confirmar")')
            await pa.wait_for_timeout(1500)
            c = await pa.content(); assert 'Inativo' in c, 'status não mudou'
            await pa.click('button:has-text("Reativar")')
            await pa.click('[role=alertdialog] button:has-text("Confirmar")')
            await pa.wait_for_timeout(1500)
            c = await pa.content(); assert 'Ativo' in c
        await check('Inativar (com motivo) e reativar material', t_inativar())
        async def t_hier():
            await pa.goto(BASE+'/classificacoes'); await pa.wait_for_selector('text=Elétricos')
            await pa.click('button:has-text("Nova família")')
            await pa.fill('#c-codigo', 'E'+str(__import__('random').randint(10,99)))
            await pa.fill('#c-nome', 'Família E2E Playwright')
            await pa.click('[role=dialog] button[type=submit]')
            await pa.wait_for_timeout(1500)
            c = await pa.content(); assert 'Família E2E Playwright' in c
        await check('Classificações: criar família pelo diálogo', t_hier())
        async def t_users():
            await pa.goto(BASE+'/usuarios'); await pa.wait_for_selector('text=Gustavo Gestor')
        await check('Admin acessa /usuarios', t_users())
        await pa.screenshot(path=os.path.join(SCREENS,'admin_materiais.png'))
        # --- Consulta flows
        ctx2 = await b.new_context(viewport={'width':390,'height':844})
        async def t_consulta():
            global pc; pc = await login(ctx2,'consulta@materialmaster.com.br',SENHA_CONSULTA)
            await pc.goto(BASE+'/materiais'); await pc.wait_for_selector('text=MAT-')
            c = await pc.content(); assert 'Novo material' not in c
            await pc.goto(BASE+'/materiais/novo'); await pc.wait_for_timeout(1000)
            assert 'sem-permissao' in pc.url, pc.url
            await pc.goto(BASE+'/usuarios'); await pc.wait_for_timeout(1000)
            assert 'sem-permissao' in pc.url, pc.url
            await pc.goto(BASE+'/classificacoes'); await pc.wait_for_timeout(1000)
            assert 'sem-permissao' in pc.url, pc.url
            await pc.screenshot(path=os.path.join(SCREENS,'consulta_mobile.png'))
        await check('Consulta (mobile): lista OK, bloqueado em novo/usuarios/classificacoes', t_consulta())
        # --- Gestor
        ctx3 = await b.new_context()
        async def t_gestor():
            pg = await login(ctx3,'gestor@materialmaster.com.br',SENHA_GESTOR)
            await pg.goto(BASE+'/materiais/novo'); await pg.wait_for_selector('form')
            await pg.goto(BASE+'/classificacoes'); await pg.wait_for_timeout(1000)
            assert 'sem-permissao' in pg.url
            await pg.click('button:has-text("Sair")')
            await pg.wait_for_url('**/login', timeout=15000)
        await check('Gestor: acessa novo material, bloqueado em classificações, logout', t_gestor())
        async def t_bad():
            p = await (await b.new_context()).new_page(); await p.goto(BASE+'/login')
            await p.fill('input[type=email]','admin@materialmaster.com.br'); await p.fill('input[type=password]','errada')
            await p.click('button[type=submit]'); await p.wait_for_timeout(2500)
            assert '/login' in p.url; c=await p.content(); assert 'inválid' in c.lower() or 'incorret' in c.lower()
        await check('Login com senha errada mostra erro pt-BR', t_bad())
        await b.close()
    for r in results: print(r[0], '-', r[1], ('-> '+r[2]) if r[2] else '')
    print(f"E2E: {sum(1 for r in results if r[0]=='PASS')}/{len(results)} aprovados")
asyncio.run(main())
