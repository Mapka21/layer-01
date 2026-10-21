// LAYER-01 como ENJAMBRE: nanobots hechos de caracteres que forman su cuerpo.
// Cada cara se dibuja como un "molde" en un canvas escondido; de ahí salen los puntos a donde vuelan
// los bots. Los bots son resortes (se pasan, rebotan y se acomodan) y el cuerpo entero tiene su propia
// "pose" con resortes: se estira, se aplasta, se inclina, rebota o tiembla según la emoción y la voz.
//   const e = ENJAMBRE.crear();  e.dibujar(ctx, estado, camara, dt, ahora)
//   estado = { cara, acc:[...], hablando, amp: 0-1 (volumen de la voz), nivel: 0-3, mirar:[x,y], parpadeo, glitch }
//   camara = { x, y, escala }   (dónde va el centro del enjambre en el canvas y cuántos px mide 1 unidad)
(function () {
const W = 300, H = 380, CX = 150, CY = 205, PASO = 4, N = 2300;
const LETRAS = "01#@*+=:./<>{}[]$%&!?".split("");
// c = color en pantalla, a = opacidad, m = color "puro" con que se pinta en el molde (para reconocerlo)
const CLASES = {
  n: { c: "#FF7A2A", a: .95, m: [255, 0, 0] },     // ojo
  g: { c: "#A9AFB9", a: .55, m: [0, 255, 0] },     // anillo (tenue: el que manda es el ojo)
  r: { c: "#FF3B30", a: .95, m: [0, 0, 255] },     // ojo en alerta
  k: { c: "#FF5C8A", a: .95, m: [128, 0, 128] },   // ojo de amor
  w: { c: "#F2EEE6", a: .9,  m: [255, 255, 0] },   // blanco (monóculo, brillos)
  s: { c: "#6B7280", a: .95, m: [0, 255, 255] },   // oscuros, párpados
  p: { c: "#8A6BFF", a: .9,  m: [255, 0, 255] },   // gorro de mago
  y: { c: "#FFD84A", a: 1,   m: [128, 128, 0] },   // dorado: estrellas, corona, aureola
  b: { c: "#B07A4A", a: .95, m: [0, 128, 128] },   // café: pipa, sombrero
  z: { c: "#8FD3FF", a: .9,  m: [0, 0, 128] },     // azul: zzz, lágrimas
  h: { c: "#E0312B", a: .95, m: [128, 0, 0] },     // rojo de ropa: cuernos, bandana, corbata
  q: { c: "#3D7BFF", a: .92, m: [0, 128, 0] },     // gorra
  x: { c: "#555B66", a: .88, m: [255, 128, 0] },   // capucha
  d: { c: "#7A808B", a: .34 },                     // órbita, lado de enfrente (dinámico)
  e: { c: "#5E636D", a: .14 },                     // órbita, lado de atrás (dinámico)
  o: { c: "#FFE2C2", a: .95 },                     // la onda de la voz (dinámico)
  v: { c: "#9CF08A", a: .95 },                     // humo (dinámico)
};
const IRIS = new Set(["n", "r", "k"]);
const RESPLANDOR = { n: "255,122,42", r: "255,59,48", k: "255,92,138" };
// orden de pintado: lo de atrás primero; el ojo y la voz al final para que siempre se lean
const ORDEN = ["e", "x", "g", "s", "q", "b", "p", "y", "h", "w", "z", "n", "r", "k", "d", "v", "o"];
const MOLDES = Object.entries(CLASES).filter(([, v]) => v.m);

const lienzo = document.createElement("canvas");
lienzo.width = W; lienzo.height = H;
const m = lienzo.getContext("2d", { willReadFrequently: true });
const cache = {};

function pintar(cara, accs) {
  m.clearRect(0, 0, W, H);
  const rgb = k => `rgb(${CLASES[k].m})`;
  const relleno = k => { m.fillStyle = rgb(k); }, trazo = (k, w) => { m.strokeStyle = rgb(k); m.lineWidth = w; m.lineCap = "round"; m.lineJoin = "round"; };
  const alerta = cara === "enojado" || cara === "error" || cara === "miedo", iris = alerta ? "r" : cara === "amor" ? "k" : "n";
  const dona = (x, y, R, r, sy = 1, rot = 0) => {
    m.beginPath(); m.ellipse(x, y, R, R * sy, rot, 0, 6.2832); m.ellipse(x, y, r, Math.max(1, r * sy), rot, 0, 6.2832, true); m.fill("evenodd");
  };
  const texto = (t, x, y, px) => { m.font = `bold ${px}px Consolas, monospace`; m.textAlign = "center"; m.textBaseline = "middle"; m.fillText(t, x, y); };
  const estrella = (x, y, R, r) => { m.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r : R; m.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } m.closePath(); m.fill(); };

  // ---- anillo exterior ----
  trazo("g", 20); m.beginPath();
  if (cara === "enojado" || cara === "miedo") {   // con picos
    const n = cara === "miedo" ? 64 : 48, pico = cara === "miedo" ? 7 : 12;
    for (let i = 0; i <= n; i++) { const a = i / n * 6.2832, r = 112 + (i % 2 ? pico : -4); m.lineTo(CX + Math.cos(a) * r, CY + Math.sin(a) * r); }
    m.stroke();
  } else if (cara === "error") {
    for (let i = 0; i < 6; i++) { m.beginPath(); m.arc(CX, CY, 114, i * 1.047 + .15, i * 1.047 + .8); m.stroke(); }
  } else { m.arc(CX, CY, cara === "sorpresa" ? 120 : 114, 0, 6.2832); m.stroke(); }

  // ---- el ojo, según la emoción ----
  relleno(iris); trazo(iris, 24);
  switch (cara) {
    case "mamon":      dona(CX + 4, CY + 10, 62, 26, .42, -.12); break;
    case "enojado":    m.beginPath(); m.moveTo(CX - 66, CY - 26); m.lineTo(CX + 66, CY - 26); m.lineTo(CX + 30, CY + 26); m.lineTo(CX - 30, CY + 26); m.closePath();
                       m.moveTo(CX - 14, CY - 6); m.lineTo(CX + 14, CY - 6); m.lineTo(CX + 8, CY + 8); m.lineTo(CX - 8, CY + 8); m.closePath(); m.fill("evenodd"); break;
    case "feliz":      m.beginPath(); m.arc(CX, CY + 34, 58, Math.PI * 1.12, Math.PI * 1.88); m.stroke(); break;
    case "xd":         texto("XD", CX, CY + 6, 118); break;
    case "error":      trazo("r", 26); m.beginPath(); m.moveTo(CX - 48, CY - 48); m.lineTo(CX + 48, CY + 48); m.moveTo(CX + 48, CY - 48); m.lineTo(CX - 48, CY + 48); m.stroke(); break;
    case "pensando":   dona(CX + 20, CY - 18, 36, 14);
                       for (let i = 0; i < 3; i++) { m.beginPath(); m.arc(CX - 26 + i * 26, CY + 58, 8, 0, 6.2832); m.fill(); } break;
    case "triste":     dona(CX, CY + 22, 54, 22, .7);
                       trazo("s", 14); m.beginPath(); m.moveTo(CX - 70, CY - 30); m.lineTo(CX + 70, CY - 54); m.stroke();
                       relleno("z"); m.beginPath(); m.ellipse(CX + 38, CY + 74, 8, 13, 0, 0, 6.2832); m.fill(); break;
    case "relax":      dona(CX, CY + 14, 62, 24, .3); break;
    case "sorpresa":   dona(CX, CY, 74, 16); relleno("w"); texto("!", CX + 92, CY - 92, 70); break;
    case "sospecha":   dona(CX - 24, CY + 6, 60, 18, .22, .06);
                       trazo("s", 12); m.beginPath(); m.moveTo(CX - 92, CY - 16); m.lineTo(CX + 60, CY - 8); m.stroke(); break;
    case "amor":       m.beginPath(); m.moveTo(CX, CY + 58);
                       m.bezierCurveTo(CX - 92, CY - 4, CX - 52, CY - 78, CX, CY - 34);
                       m.bezierCurveTo(CX + 52, CY - 78, CX + 92, CY - 4, CX, CY + 58); m.fill(); break;
    case "confundido": texto("?", CX + 6, CY + 4, 170); break;
    case "dormido":    trazo(iris, 14); m.beginPath(); m.arc(CX, CY - 4, 54, Math.PI * .15, Math.PI * .85); m.stroke();
                       relleno("z"); texto("z", CX + 64, CY - 66, 34); texto("Z", CX + 92, CY - 100, 50); break;
    case "emocionado": estrella(CX, CY, 70, 30);
                       relleno("y"); estrella(CX - 82, CY - 70, 14, 5); estrella(CX + 86, CY - 56, 10, 4); estrella(CX + 70, CY + 76, 12, 5); break;
    case "miedo":      dona(CX, CY, 22, 8); relleno("z"); m.beginPath(); m.ellipse(CX - 54, CY + 46, 7, 12, 0, 0, 6.2832); m.fill(); break;
    case "aburrido":   dona(CX, CY + 18, 62, 26, .55);
                       relleno("s"); m.beginPath(); m.rect(CX - 72, CY - 44, 144, 50); m.fill(); break;
    default:           dona(CX, CY, 62, 26);   // neutral y glitch
  }

  // ---- outfits (también de bots) ----
  const tiene = a => accs.includes(a);
  if (tiene("capucha")) {   // capucha que enmarca el anillo
    relleno("x"); m.beginPath(); m.moveTo(CX - 148, CY + 150); m.quadraticCurveTo(CX - 172, CY - 120, CX, CY - 168);
    m.quadraticCurveTo(CX + 172, CY - 120, CX + 148, CY + 150); m.lineTo(CX + 120, CY + 150); m.quadraticCurveTo(CX + 140, CY - 96, CX, CY - 136);
    m.quadraticCurveTo(CX - 140, CY - 96, CX - 120, CY + 150); m.closePath(); m.fill();
  }
  if (tiene("lentes") && !tiene("oscuros")) {
    trazo("w", 7); m.beginPath(); m.arc(CX, CY, 78, 0, 6.2832); m.stroke();
    m.beginPath(); m.moveTo(CX + 72, CY + 30); m.quadraticCurveTo(CX + 120, CY + 110, CX + 96, CY + 150); m.lineWidth = 4; m.stroke();
  }
  if (tiene("oscuros")) {
    relleno("s"); m.beginPath(); m.roundRect(CX - 96, CY - 34, 192, 68, 18); m.fill();
    trazo("w", 5); m.beginPath(); m.moveTo(CX - 70, CY - 14); m.lineTo(CX - 40, CY - 24); m.moveTo(CX + 30, CY - 14); m.lineTo(CX + 60, CY - 24); m.stroke();
  }
  if (tiene("ninja")) {      // bandana que cruza el anillo, con las puntas al viento
    relleno("h"); m.beginPath(); m.moveTo(CX - 124, CY - 72); m.lineTo(CX + 124, CY - 92); m.lineTo(CX + 128, CY - 64); m.lineTo(CX - 120, CY - 44); m.closePath(); m.fill();
    m.beginPath(); m.moveTo(CX + 120, CY - 80); m.quadraticCurveTo(CX + 160, CY - 90, CX + 186, CY - 60); m.lineTo(CX + 176, CY - 52); m.quadraticCurveTo(CX + 156, CY - 74, CX + 122, CY - 64); m.fill();
    m.beginPath(); m.moveTo(CX + 120, CY - 72); m.quadraticCurveTo(CX + 150, CY - 54, CX + 160, CY - 20); m.lineTo(CX + 150, CY - 18); m.quadraticCurveTo(CX + 142, CY - 50, CX + 120, CY - 60); m.fill();
  }
  if (tiene("audifonos")) {
    trazo("w", 8); m.beginPath(); m.arc(CX, CY, 140, Math.PI * 1.15, Math.PI * 1.85); m.stroke();
    relleno("w"); m.beginPath(); m.roundRect(CX - 152, CY - 40, 22, 80, 8); m.roundRect(CX + 130, CY - 40, 22, 80, 8); m.fill();
  }
  if (tiene("cuernos")) {
    relleno("h");
    for (const s of [-1, 1]) { m.beginPath(); m.moveTo(CX + s * 52, CY - 100); m.quadraticCurveTo(CX + s * 88, CY - 150, CX + s * 66, CY - 186);
      m.quadraticCurveTo(CX + s * 108, CY - 150, CX + s * 92, CY - 90); m.closePath(); m.fill(); }
  }
  if (tiene("aureola")) { trazo("y", 8); m.beginPath(); m.ellipse(CX, CY - 158, 74, 16, 0, 0, 6.2832); m.stroke(); }
  if (tiene("corona")) {
    relleno("y"); m.beginPath(); m.moveTo(CX - 66, CY - 104); m.lineTo(CX - 74, CY - 160); m.lineTo(CX - 38, CY - 132); m.lineTo(CX, CY - 172);
    m.lineTo(CX + 38, CY - 132); m.lineTo(CX + 74, CY - 160); m.lineTo(CX + 66, CY - 104); m.closePath(); m.fill();
    relleno("h"); m.beginPath(); m.arc(CX, CY - 124, 7, 0, 6.2832); m.fill();
  }
  if (tiene("gorra")) {      // gorra hacia atrás, con la visera a un lado
    relleno("q"); m.beginPath(); m.ellipse(CX, CY - 100, 102, 52, 0, Math.PI, 0); m.fill();
    m.beginPath(); m.ellipse(CX - 104, CY - 98, 54, 12, -.12, 0, 6.2832); m.fill();
    relleno("w"); m.beginPath(); m.arc(CX, CY - 150, 7, 0, 6.2832); m.fill();
  }
  if (tiene("vaquero")) {
    relleno("b"); m.beginPath(); m.ellipse(CX, CY - 104, 150, 22, 0, 0, 6.2832); m.fill();
    m.beginPath(); m.moveTo(CX - 70, CY - 108); m.quadraticCurveTo(CX - 74, CY - 186, CX - 20, CY - 168); m.quadraticCurveTo(CX, CY - 156, CX + 20, CY - 168);
    m.quadraticCurveTo(CX + 74, CY - 186, CX + 70, CY - 108); m.closePath(); m.fill();
    relleno("y"); m.beginPath(); m.rect(CX - 68, CY - 126, 136, 10); m.fill();
  }
  if (tiene("gorro")) {
    relleno("p"); m.beginPath(); m.moveTo(CX - 92, CY - 112); m.quadraticCurveTo(CX - 20, CY - 140, CX + 6, CY - 196);
    m.quadraticCurveTo(CX + 30, CY - 204, CX + 52, CY - 196); m.quadraticCurveTo(CX + 30, CY - 186, CX + 26, CY - 170);
    m.quadraticCurveTo(CX + 48, CY - 130, CX + 92, CY - 112); m.closePath(); m.fill();
    m.beginPath(); m.ellipse(CX, CY - 110, 118, 14, 0, 0, 6.2832); m.fill();
    relleno("y"); m.beginPath(); m.arc(CX + 54, CY - 196, 7, 0, 6.2832); m.fill(); estrella(CX - 20, CY - 140, 11, 4);
  }
  if (tiene("pipa")) {
    trazo("b", 7); m.beginPath(); m.moveTo(CX + 60, CY + 70); m.lineTo(CX + 96, CY + 86); m.stroke();
    relleno("b"); m.beginPath(); m.roundRect(CX + 90, CY + 60, 24, 30, 6); m.fill();
  }
  if (tiene("corbata")) {
    relleno("h"); m.beginPath(); m.moveTo(CX - 12, CY + 128); m.lineTo(CX + 12, CY + 128); m.lineTo(CX + 8, CY + 142);
    m.lineTo(CX + 20, CY + 176); m.lineTo(CX, CY + 192); m.lineTo(CX - 20, CY + 176); m.lineTo(CX - 8, CY + 142); m.closePath(); m.fill();
  }

  // ---- leer el molde: cada PASO px con color se vuelve un punto destino ----
  const d = m.getImageData(0, 0, W, H).data, puntos = [];
  for (let y = 0; y < H; y += PASO) for (let x = 0; x < W; x += PASO) {
    const i = (y * W + x) * 4;
    if (d[i + 3] < 140) continue;
    let mejor = "g", dist = 1e9;
    for (const [k, v] of MOLDES) { const c = v.m, e = (c[0] - d[i]) ** 2 + (c[1] - d[i + 1]) ** 2 + (c[2] - d[i + 2]) ** 2; if (e < dist) { dist = e; mejor = k; } }
    puntos.push([x + (Math.random() - .5) * 2, y + (Math.random() - .5) * 2, mejor]);
  }
  for (let i = puntos.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [puntos[i], puntos[j]] = [puntos[j], puntos[i]]; }
  // centro y color del ojo, para pintarle el resplandor detrás
  const ojo = puntos.filter(q => IRIS.has(q[2]));
  puntos.ojo = ojo.length ? [ojo.reduce((s, q) => s + q[0], 0) / ojo.length, ojo.reduce((s, q) => s + q[1], 0) / ojo.length, ojo[0][2]]
                          : [CX, CY, "n"];
  return puntos;
}

// ---- gesto de cada emoción: hacia dónde jalan los resortes del cuerpo (x, y, giro, estirar) ----
function gesto(cara, t) {
  const s = Math.sin, azar = () => Math.random() - .5;
  const g = { x: s(t * .7) * 5, y: s(t * 1.1) * 3, rot: s(t * .5) * .03, sx: 1, sy: 1 };
  switch (cara) {
    case "mamon":      g.rot = -.11 + s(t * .6) * .02; g.x = 8; g.sy = 1.03; break;
    case "feliz":      g.y = -Math.abs(s(t * 5.5)) * 12; g.sy = 1 + .05 * s(t * 11); break;
    case "xd":         g.y = -Math.abs(s(t * 8)) * 18; g.rot = s(t * 8) * .09; break;
    case "enojado":    g.x = azar() * 6; g.y = azar() * 6; g.sx = g.sy = 1.07; break;
    case "triste":     g.y = 18; g.sy = .95; g.rot = .05 + s(t * .6) * .02; break;
    case "pensando":   g.rot = .13 + s(t * .9) * .03; g.x = -10; break;
    case "error":      g.sy = .86; g.sx = 1.1; g.x = azar() * 9; break;
    case "relax":      g.rot = s(t * .8) * .07; g.y = s(t * .8) * 6; break;
    case "sorpresa":   g.sx = g.sy = 1.12; g.y = -10; break;
    case "sospecha":   g.x = -14 + s(t * .7) * 3; g.rot = -.06; g.sx = 1.05; g.sy = .95; break;
    case "amor":       { const b = Math.pow(Math.abs(s(t * 3.2)), 8); g.sx = g.sy = 1 + b * .09; g.y = s(t * 1.3) * 6; } break;
    case "confundido": g.rot = s(t * 2.2) * .13; g.x = s(t * 1.1) * 6; break;
    case "dormido":    g.y = 10; g.sy = 1 + s(t * 1.2) * .035; g.rot = .06; break;
    case "emocionado": g.y = -Math.abs(s(t * 9)) * 16; g.rot = s(t * 4.5) * .07; g.sx = g.sy = 1.05; break;
    case "miedo":      g.x = azar() * 7; g.sx = g.sy = .9; g.y = 6; break;
    case "aburrido":   g.rot = .09; g.y = 10 + s(t * .5) * 2; g.sy = .97; break;
  }
  return g;
}
// al entrar a una emoción: un "pop" (se aplasta y rebota); algunas además brincan
const BRINCO = { sorpresa: -170, xd: -120, emocionado: -150, feliz: -80, miedo: 90, triste: 60 };

const ORBITA = 240, ONDA = 110, HUMO = 60;   // grupos que se mueven solos (no salen del molde)
function crear() {
  const P = [];
  for (let i = 0; i < N; i++) {
    const rig = .55 + Math.random() * .9, kk = 95 * rig;   // cada bot con su propia rigidez: se ve líquido
    P.push({ x: CX + (Math.random() - .5) * 600, y: CY + (Math.random() - .5) * 700, vx: 0, vy: 0, kk, cc: 2 * .5 * Math.sqrt(kk),
             k: "g", c: LETRAS[Math.random() * LETRAS.length | 0], f: Math.random() * 6.2832 });
  }
  let forma = "", puntos = [], caraAntes = "";
  const pose = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 }, vel = { x: 0, y: 0, rot: 0, sx: 0, sy: 0 };
  const RIG = { x: 110, y: 110, rot: 90, sx: 220, sy: 220 }, AMORT = .42;   // resortes del cuerpo (rebotones)

  function dibujar(ctx, e, cam, dt, ahora) {
    const accs = (e.acc || []).slice().sort(), clave = e.cara + "|" + accs.join(",");
    if (clave !== forma) { forma = clave; puntos = cache[clave] ??= pintar(e.cara, accs); }
    const t = ahora / 1000, pipa = accs.includes("pipa");
    // amp: volumen de la voz 0-1, continuo (si no llega, sale del nivel 0-3)
    const amp = e.hablando ? (e.amp ?? (e.nivel || 0) / 3) : 0;
    const [mx, my] = e.mirar || [0, 0], pulso = 1 + amp * .16;
    const base0 = ORBITA + ONDA + (pipa ? HUMO : 0);

    // ---- cuerpo: pop al cambiar de cara, gesto de la emoción y energía de la voz ----
    if (e.cara !== caraAntes) {
      caraAntes = e.cara; vel.sy -= 3.5; vel.sx += 2.5; vel.y += BRINCO[e.cara] || 0;
    }
    const g = gesto(e.cara, t);
    g.sy += amp * .07; g.sx -= amp * .035; g.y -= amp * 7; g.rot += Math.sin(t * 7) * .035 * amp;
    const pasos = Math.max(1, Math.ceil(dt * 120)), h = dt / pasos;
    for (let n = 0; n < pasos; n++) for (const k in pose) {
      const a = RIG[k] * (g[k] - pose[k]) - 2 * AMORT * Math.sqrt(RIG[k]) * vel[k];
      vel[k] += a * h; pose[k] += vel[k] * h;
    }

    // ---- a dónde va cada bot ----
    const vueltas = .45 + amp * 1.1 + (e.cara === "emocionado" || e.cara === "xd" ? .9 : 0);
    const incl = -.21 + Math.sin(t * .4) * .08, ci = Math.cos(incl), si = Math.sin(incl);
    const voz = amp > .03;   // la onda solo existe mientras habla; callado, sus bots se van a la órbita
    for (let i = 0; i < N; i++) {
      const p = P[i];
      let tx, ty, k;
      if (i < ORBITA || (i < ORBITA + ONDA && !voz)) {   // órbita inclinada: atrás casi invisible, enfrente tenue
        const a = i / (ORBITA + ONDA) * 6.2832 + t * vueltas, x0 = Math.cos(a) * 160, y0 = Math.sin(a) * 30;
        tx = CX + x0 * ci - y0 * si; ty = CY + x0 * si + y0 * ci; k = y0 < 0 ? "e" : "d";
      } else if (i < ORBITA + ONDA) {         // la voz: osciloscopio abajo del ojo, esa es su "boca"
        const u = (i - ORBITA) / (ONDA - 1) * 2 - 1, env = 1 - u * u;
        tx = CX + u * 92;
        ty = CY + 86 + (Math.sin(u * 11 + t * 21) * .6 + Math.sin(u * 23 - t * 33) * .3 + Math.sin(u * 5 + t * 9) * .4) * amp * 30 * env;
        k = "o";
      } else if (pipa && i < base0) {         // humo verde de la pipa: sube y se desvanece
        const j = i - ORBITA - ONDA, vida = (t * .45 + j / HUMO) % 1;
        tx = CX + 102 + Math.sin(vida * 9 + j) * 10 + vida * 22; ty = CY + 56 - vida * 150; k = "v"; p.vida = vida;
      } else {                                // el cuerpo: sale del molde
        const q = puntos.length ? puntos[(i - base0) % puntos.length] : [CX, CY, "g"];
        tx = q[0]; ty = q[1]; k = q[2];
        if (IRIS.has(k)) {                    // el ojo mira, late con la voz y parpadea
          tx = CX + (tx - CX) * pulso + mx * 9; ty = CY + (ty - CY) * pulso + my * 7;
          if (e.parpadeo) ty = CY + (ty - CY) * .1;
        } else if (k === "g") {               // el anillo vibra con la voz, como visualizador
          const a = Math.atan2(ty - CY, tx - CX), f = 1 + .1 * amp * Math.sin(a * 7 + t * 14) + .012 * Math.sin(a * 3 + t * 1.5);
          tx = CX + (tx - CX) * f; ty = CY + (ty - CY) * f;
        }
      }
      tx += Math.sin(t * 2 + p.f) * 1.3; ty += Math.cos(t * 1.7 + p.f) * 1.3;
      // resorte con inercia (se pasa un poquito y regresa); en pasitos para que no se descontrole
      for (let n = 0; n < pasos; n++) {
        p.vx += (p.kk * (tx - p.x) - p.cc * p.vx) * h; p.x += p.vx * h;
        p.vy += (p.kk * (ty - p.y) - p.cc * p.vy) * h; p.y += p.vy * h;
      }
      if (e.glitch && Math.random() < .05) p.vx += (Math.random() - .5) * 450;   // con más, el enjambre explotaba
      if (Math.random() < .012) p.c = LETRAS[Math.random() * LETRAS.length | 0];
      p.k = k;
    }

    // ---- pintar: estela suave + resplandor del ojo + bots por capas ----
    const borra = Math.min(1, .55 * dt * 30);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = `rgba(0,0,0,${borra.toFixed(3)})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.translate(cam.x, cam.y); ctx.scale(cam.escala, cam.escala);
    ctx.translate(pose.x, pose.y); ctx.rotate(pose.rot); ctx.scale(pose.sx, pose.sy); ctx.translate(-CX, -CY);
    if (!e.parpadeo) {   // halo alrededor del ojo (el centro queda oscuro: la pupila se sigue viendo)
      const [ox, oy, ok] = puntos.ojo || [CX, CY, "n"], c = RESPLANDOR[ok] || RESPLANDOR.n;
      const gx = CX + (ox - CX) * pulso + mx * 9, gy = CY + (oy - CY) * pulso + my * 7, rr = 98 + amp * 30;
      // la estela acumula el halo cuadro tras cuadro; multiplicar por "borra" lo deja en su brillo real
      const al = (.26 + amp * .22) * borra, gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr);
      gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(.3, `rgba(${c},0)`);
      gr.addColorStop(.55, `rgba(${c},${al.toFixed(3)})`); gr.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = gr; ctx.fillRect(gx - rr, gy - rr, rr * 2, rr * 2);
    }
    ctx.font = "bold 5px Consolas, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const grupos = {};
    for (const p of P) (grupos[p.k] ??= []).push(p);
    if (e.glitch) {
      for (const [c, dx] of [["#ff2e3c", -3], ["#2ee6ff", 3]]) {
        ctx.fillStyle = c; ctx.globalAlpha = .45;
        for (const p of P) if (Math.random() < .3) ctx.fillText(p.c, p.x + dx, p.y);
      }
    }
    for (const k of ORDEN) {
      if (!grupos[k]) continue;
      ctx.fillStyle = CLASES[k].c;
      for (const p of grupos[k]) { ctx.globalAlpha = k === "v" ? CLASES.v.a * (1 - (p.vida || 0)) : CLASES[k].a; ctx.fillText(p.c, p.x, p.y); }
    }
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  return { dibujar };
}

window.ENJAMBRE = { crear, ANCHO: W, ALTO: H, CX, CY };
})();
