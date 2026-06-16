/**
 * crawl-pokepc.mjs
 *
 * Busca o dataset completo do PokéPC CDN (todos os 1595 Pokémon/formas),
 * compara com nosso public/data/pokemon-compiled.json e gera relatório.
 *
 * Uso:
 *   node scripts/crawl-pokepc.mjs
 *
 * Saída:
 *   scripts/pokepc-forms.json   ← lista bruta do site (id + nid + nome + forma)
 *   scripts/diff-report.json    ← diferenças filtradas
 */

import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_SITE = join(__dirname, 'pokepc-forms.json');
const OUT_DIFF = join(__dirname, 'diff-report.json');
const COMPILED = join(__dirname, '../public/data/pokemon-compiled.json');

// ---------------------------------------------------------------------------
// Regras de exclusão (definidas pela usuária)
// ---------------------------------------------------------------------------

// Pokémon cujas variantes NÃO devem ser incluídas (exceto base)
const EXCLUDE_VARIANTS_FOR_DEX = new Set([
  // cosmético / animation only — manter apenas 1 entrada
  201,   // Unown A-Z + ! + ?
  716,   // Xerneas Active Mode
  773,   // Silvally 18 tipos
  778,   // Mimikyu Busted (in-battle)
  869,   // Alcremie 28 sabores (Gmax é separada)
  931,   // Squawkabilly 4 cores
  774,   // Minior 7 core colors
  // extra forms explicitamente excluídas pela usuária
  649,   // Genesect drives
  670,   // Floette cores (Eternal Flower é exceção abaixo)
  801,   // Magearna original/mega
  845,   // Cramorant Gulping/Gorging
  849,   // Toxtricity Low Key
  854,   // Sinistea Antique
  855,   // Polteageist Antique
  893,   // Zarude Dada
  1012,  // Poltchageist Artisan
  1013,  // Sinistcha Masterpiece
]);

// IDs específicos que são EXCEÇÕES (aceitos mesmo para pokémon no set acima)
const ALLOW_SPECIFIC_IDS = new Set([
  '0670-eternal', // Floette Eternal Flower — explicitamente aceito
]);

// NIDs excluídos individualmente (variantes que não queremos adicionar)
const EXCLUDE_SPECIFIC_NIDS = new Set([
  '0978-droopy-mega', // só queremos Tatsugiri Mega base
  '0978-stretchy-mega',
]);

// Suffixes que indicam male/female — excluímos (tratamos como 1 entrada)
const GENDER_SUFFIXES = ['-f', '-m', '-male', '-female'];

// ---------------------------------------------------------------------------
// Passo 1 — Descobre a URL do JSON via Puppeteer e faz download
// ---------------------------------------------------------------------------
async function fetchDatasetUrl() {
  console.log('Iniciando Puppeteer para capturar URL do dataset...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  let datasetUrl = null;
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('cdn.pokepc.net') && url.includes('.min.json')) {
      datasetUrl = url;
    }
  });

  console.log('Carregando página principal...');
  await page.goto('https://pokepc.net/pokedex/national?forms=true', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  // Espera __pokepcData.loaded
  console.log('Aguardando dados carregarem...');
  for (let i = 0; i < 20; i++) {
    const loaded = await page.evaluate(() => window.__pokepcData?.loaded === true);
    if (loaded) break;
    await new Promise(r => setTimeout(r, 1000));
    process.stdout.write('.');
  }
  console.log('');

  await browser.close();
  return datasetUrl;
}

// ---------------------------------------------------------------------------
// Passo 2 — Baixa e parseia o JSON do CDN
// ---------------------------------------------------------------------------
async function downloadDataset(url) {
  console.log('Baixando dataset:', url);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} ao baixar ${url}`);
  const data = await resp.json();
  return data;
}

// ---------------------------------------------------------------------------
// Passo 3 — Normaliza a lista para comparação
// Cada entrada: { id, nid, dexNum, name, formName }
// ---------------------------------------------------------------------------
function normalizeDataset(rawData) {
  const pokemon = rawData.pokemon || [];
  console.log(`Dataset tem ${pokemon.length} entradas.`);

  return pokemon.map(p => {
    const id = p.id;          // ex: "venusaur-mega", "raichu-mega-x"
    const nid = p.nid;        // ex: "0003", "0026"
    const dexNum = p.dexNum;  // número inteiro
    const name = p.name || p.id;
    const formName = p.formName || p.form || null;
    return { id, nid, dexNum, name, formName };
  });
}

// ---------------------------------------------------------------------------
// Passo 4 — Compara com nosso compilado e filtra conforme regras
// ---------------------------------------------------------------------------
function compare(siteList, compiled) {
  const ourIds = new Set(compiled.map(p => p.id));
  const ourByDex = {};
  compiled.forEach(p => {
    const d = p.dexNumber;
    if (!ourByDex[d]) ourByDex[d] = [];
    ourByDex[d].push(p.id);
  });

  const missing = [];

  for (const entry of siteList) {
    const { id, nid, dexNum, name, formName } = entry;

    // Já temos esse ID? (comparar usando nid que coincide com nosso formato)
    if (ourIds.has(nid)) continue;

    // É variante de gender? (excluímos)
    const isGender = GENDER_SUFFIXES.some(s => id.endsWith(s));
    if (isGender) continue;

    // Está nas exceções permitidas especificamente?
    const isAllowed = ALLOW_SPECIFIC_IDS.has(id);

    // O dex deste pokémon é um dos excluídos?
    const dexExcluded = EXCLUDE_VARIANTS_FOR_DEX.has(dexNum);

    if (dexExcluded && !isAllowed) continue;

    // Excluído individualmente?
    if (EXCLUDE_SPECIFIC_NIDS.has(nid)) continue;

    // Entrou: está faltando
    missing.push({ id, nid, dexNum, name, formName });
  }

  return missing;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  try {
    // 1. Descobre URL do dataset
    const datasetUrl = await fetchDatasetUrl();
    if (!datasetUrl) throw new Error('Não foi possível capturar URL do dataset CDN.');
    console.log('Dataset URL:', datasetUrl);

    // 2. Baixa dataset
    const rawData = await downloadDataset(datasetUrl);

    // 3. Normaliza
    const siteList = normalizeDataset(rawData);
    writeFileSync(OUT_SITE, JSON.stringify(siteList, null, 2), 'utf-8');
    console.log(`Salvo: ${OUT_SITE} (${siteList.length} entradas)`);

    // 4. Carrega nosso compilado
    const compiled = JSON.parse(readFileSync(COMPILED, 'utf-8'));
    console.log(`Nosso compilado: ${compiled.length} entradas`);

    // 5. Compara
    const missing = compare(siteList, compiled);

    // 6. Relatório
    const report = {
      timestamp: new Date().toISOString(),
      datasetUrl,
      siteTotal: siteList.length,
      ourTotal: compiled.length,
      missingCount: missing.length,
      missing,
    };
    writeFileSync(OUT_DIFF, JSON.stringify(report, null, 2), 'utf-8');

    // 7. Exibe resultado
    console.log('\n=== RESULTADO FINAL ===');
    console.log(`Site:       ${siteList.length} entradas`);
    console.log(`Nosso dado: ${compiled.length} entradas`);
    console.log(`Faltando:   ${missing.length} entradas (após filtros)`);

    // Agrupa por categoria
    const megas   = missing.filter(p => p.id.includes('mega'));
    const other   = missing.filter(p => !p.id.includes('mega'));

    console.log(`\n--- MEGAS FALTANDO (${megas.length}) ---`);
    megas.forEach(p => console.log(`  ${p.nid} | ${p.name} | ${p.formName || p.id}`));

    console.log(`\n--- OUTRAS FORMAS FALTANDO (${other.length}) ---`);
    other.forEach(p => console.log(`  ${p.nid} | ${p.name} | ${p.formName || p.id} | id: ${p.id}`));

    console.log(`\nRelatório completo em: ${OUT_DIFF}`);
  } catch (err) {
    console.error('Erro:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
