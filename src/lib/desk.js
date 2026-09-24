// The record generator. Pure: no DOM, no network, no clock - so the same
// seeds + salt + corpus always rebuild the same record, and tests can prove it.
//
// Ported from the single-file Cryptonym Desk. The algorithm is unchanged; what
// changed is that every word bank now arrives from Sanity as {value, weight}
// entries instead of living in hard-coded arrays.

/* ── seeded RNG, so a record can be rebuilt from its file reference ── */
export function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ── text cutting ──────────────────────────────────────────────────── */
const SKIP = ["the", "of", "and", "a", "an", "in", "to", "no", "le", "la"];

export function words(list) {
  const out = [];
  list.forEach((s) => {
    String(s).split(/[^A-Za-z']+/).forEach((w) => {
      if (w.length > 2 && SKIP.indexOf(w.toLowerCase()) === -1) out.push(w);
    });
  });
  return out;
}

/* Split at vowel groups: "Spiegel" -> ["Spie","gel"]. Crude on purpose -
   a tidy linguistic syllabifier produces tidier, duller mashups.
   Each part is consonants + a vowel group; trailing consonants stay on the
   last part. The single-file desk documented this split but its regex kept
   one consonant after each vowel group ("Spieg","el" / "Kus","an","ag","i"),
   so its own README example could never be produced. Fixed in this port.  */
export function parts(word) {
  const m = word.match(/[^aeiou]*[aeiou]+(?:[^aeiou]+$)?/gi);
  return (m && m.length > 1) ? m : [word];
}

export function titled(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }

/* Weighted pick over [{value, weight}]. Consumes exactly one r() call, like
   pick(), so a corpus where every weight is 1 draws the same stream shape.  */
export function weighted(entries, r) {
  let total = 0;
  for (const e of entries) total += e.weight;
  let x = r() * total;
  for (const e of entries) {
    x -= e.weight;
    if (x < 0) return e.value;
  }
  return entries[entries.length - 1].value;
}

/* Graft the front of one name onto the tail of another. */
export function mash(a, b, r) {
  const pa = parts(a), pb = parts(b);
  const cutA = Math.max(1, Math.ceil(pa.length * (r() < .5 ? .5 : .34)));
  const cutB = Math.max(1, Math.floor(pb.length * .5));
  const head = pa.slice(0, cutA).join("");
  const tail = pb.slice(pb.length - cutB).join("");
  let joined = head + tail;
  if (joined.length < 4) joined = head + pb.join("");
  // Collapse a tripled letter at the seam - "Rippley" not "Ripppley".
  joined = joined.replace(/(.)\1{2,}/g, "$1$1");
  return titled(joined);
}

/* corpus = { digraphs: [{code}], banks: {stations: [{value, weight}], ...} } */
export function build(corpus, seeds, salt) {
  const B = corpus.banks;
  const codes = corpus.digraphs.map((d) => d.code);
  let pool = words(seeds);
  if (!pool.length) pool = ["Anonymous", "Subject"];
  const r = rng(hash(seeds.join("|") + "#" + salt));

  let cryptoWord = pick(pool, r).toUpperCase();
  if (cryptoWord.length < 4) cryptoWord = cryptoWord + weighted(B.noun, r);

  const a = pick(pool, r);
  let b = pick(pool, r), guard = 0;
  while (b === a && pool.length > 1 && guard++ < 12) b = pick(pool, r);
  const first = mash(a, b, r);
  const c = pick(pool, r), d = pick(pool, r);
  let last = mash(d, c, r);
  if (last.toLowerCase() === first.toLowerCase()) last = titled(pick(pool, r) + "son");

  const year = 1961 + Math.floor(r() * 44);
  const digraph = pick(codes, r);

  return {
    digraph,
    word:      cryptoWord,
    from:      a,
    alias:     first + " " + last,
    aliasFrom: a + " × " + b,
    codename:  weighted(B.adj, r) + " " + weighted(B.noun, r),
    cover:     "a " + weighted(B.cover_role, r) + " for " + weighted(B.cover_firm, r),
    station:   weighted(B.stations, r),
    dir:       weighted(B.directorates, r),
    clearance: weighted(B.clearances, r),
    year,
    ref:       pick(codes, r) + "-" + (100 + Math.floor(r() * 899)) + "/" + String(year).slice(2),
    corpus:    corpus.rev,
  };
}
