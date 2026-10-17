/*
 * Utilidades puras da ouvidoria: formatadores, normalizadores, mapeadores e
 * validadores sem estado. Foram tiradas do manipulador_formulario para deixar
 * o orquestrador menor. Nenhuma funcao aqui le ou escreve estado do modulo:
 * tudo entra por parametro e sai como retorno.
 */
export function normalizarPrazosResposta(payload) {
  const list = normalizeListPayload(payload);
  const mapa = new Map();
  list.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const tipo = String(item.tipoManifestacao ?? "")
      .trim()
      .toUpperCase();
    if (!tipo) return;
    const min = Number(item.diasPrazoMinimo);
    const max = Number(item.diasPrazoMaximo);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    mapa.set(tipo, { diasPrazoMinimo: min, diasPrazoMaximo: max });
  });
  return mapa;
}

export function formatarIntervaloPrazo(min, max) {
  if (min === max) return `${min} dias`;
  return `${min} a ${max} dias`;
}

export function normalizeListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const candidates = [
    payload.categorias,
    payload.departamentos,
    payload.data,
    payload.items,
    payload.content,
    payload.resultado,
    payload.lista,
  ].find(Array.isArray);

  return Array.isArray(candidates) ? candidates : [];
}

export function firstStringFromObject(obj, keys) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const val = obj[key];
    if (val == null) continue;
    const str = String(val).trim();
    if (str) return str;
  }
  return "";
}

export function mapSelectableItem(item, idKeys, nomeKeys) {
  if (!item) return null;

  if (typeof item === "string") {
    const nome = item.trim();
    if (!nome) return null;
    return { id: nome, nome };
  }

  if (typeof item !== "object") return null;

  const nomeStr = firstStringFromObject(item, nomeKeys);
  const idStrRaw = firstStringFromObject(item, idKeys);
  const idStr = idStrRaw || nomeStr;
  const nomeFinal = nomeStr || idStr;

  if (!idStr && !nomeFinal) return null;

  return { id: idStr || nomeFinal, nome: nomeFinal || idStr };
}

export const CATEGORIA_ID_KEYS = [
  "tipo",
  "valor",
  "id",
  "categoriaId",
  "codigo",
  "uuid",
  "key",
];

export const CATEGORIA_NOME_KEYS = ["nome", "descricao", "titulo", "label", "name"];

/** TipoCategoriaManifestacaoDTO: { tipo, nome, descricao } + formatos legados. */
export function mapCategoriaItem(item) {
  if (!item) return null;

  if (typeof item === "string") {
    const nome = item.trim();
    if (!nome) return null;
    return { id: nome, nome };
  }

  if (typeof item !== "object") return null;

  const id = firstStringFromObject(item, CATEGORIA_ID_KEYS);
  const nome = firstStringFromObject(item, CATEGORIA_NOME_KEYS);
  if (!id && !nome) return null;

  return { id: id || nome, nome: nome || id };
}

export function dedupeOptions(items) {
  const dedup = new Map();
  items.forEach((d) => {
    if (!dedup.has(d.id)) dedup.set(d.id, d);
  });
  return Array.from(dedup.values());
}

export function sortOptionsByNome(items) {
  return [...items].sort((a, b) =>
    String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
      sensitivity: "base",
    }),
  );
}

export function normalizarChaveLookup(val) {
  return String(val ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function registrarOpcoesLookup(mapa, options) {
  if (!mapa) return;
  (options || []).forEach((opt) => {
    if (!opt) return;
    const id = String(opt.id ?? "").trim();
    const nome = String(opt.nome ?? id).trim();
    if (!id && !nome) return;
    if (id) mapa.set(normalizarChaveLookup(id), nome || id);
    if (nome) mapa.set(normalizarChaveLookup(nome), nome);
  });
}

export function isProvavelEnum(val) {
  const s = String(val ?? "").trim();
  if (!s) return false;
  if (isUuid(s)) return false;
  if (/^\d+$/.test(s)) return false;
  return true;
}

export function humanizarEnum(val) {
  const s = String(val ?? "").trim();
  if (!s) return s;
  if (s.includes("_")) {
    return s
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }
  const spaced = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function resolverLabelLookup(mapa, valor) {
  const raw = String(valor ?? "").trim();
  if (!raw) return "";
  const label = mapa.get(normalizarChaveLookup(raw));
  return label ? String(label).trim() : "";
}

export const TIPO_MANIFESTACAO_PROTOCOLO_KEYS = [
  "tipo de manifestação",
  "tipoDeManifestacao",
  "tipo_manifestacao",
  "tipoManifestacao",
  "tipoManifestacaoNome",
];

export function extrairTipoManifestacaoProtocolo(data) {
  if (!data || typeof data !== "object") return "";
  return firstStringFromObject(data, TIPO_MANIFESTACAO_PROTOCOLO_KEYS);
}

export function extrairCampoProtocolo(data, valorKeys, nomeKeys) {
  if (!data || typeof data !== "object") return { id: "", nome: "" };
  const nome = firstStringFromObject(data, nomeKeys);
  if (nome) return { id: "", nome };
  const id = firstStringFromObject(data, valorKeys);
  return { id, nome: "" };
}

export function formatarNomeCategoriaExibicao(nome) {
  const s = String(nome ?? "").trim();
  if (!s || s === "—") return s || "—";
  return s.toLocaleUpperCase("pt-BR");
}

export function isUuid(val) {
  const s = String(val || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

export function normalizeUuidLike(val) {
  const s = String(val || "")
    .trim()
    .replace(/^\{/, "")
    .replace(/\}$/, "");

  // Alguns lugares removem o zero à esquerda do 1º bloco (7 chars).
  // Ex.: "107d15b-..." -> "0107d15b-..."
  const m =
    /^([0-9a-f]{7})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(
      s,
    );
  if (m) return `0${m[1]}-${m[2]}-${m[3]}-${m[4]}-${m[5]}`;

  return s;
}

export function truncarNomeArquivo(nome, limite) {
  const s = String(nome || "").trim();
  const n = Number(limite);
  if (!s) return "";
  if (!Number.isFinite(n) || n <= 0) return s;
  if (s.length <= n) return s;
  if (n <= 1) return "…";
  return `${s.slice(0, n - 1)}…`;
}
