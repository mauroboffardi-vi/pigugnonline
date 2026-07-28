const SVG_NS = 'http://www.w3.org/2000/svg';

function ensureBuscheVisualizerStyles() {
    if (document.getElementById('busche-visualizer-styles')) return;

    const style = document.createElement('style');
    style.id = 'busche-visualizer-styles';
    style.textContent = `
    .busche-board-cell {
      grid-area: 1 / 1;
      align-self: start;
      justify-self: start;
      padding: 8px;
      z-index: 2;
      pointer-events: none;
    }

    .busche-note-slot {
      width: min(190px, 22vw);
      min-width: 138px;
    }

    .busche-note {
      position: relative;
      transform: rotate(-2.8deg);
      transform-origin: 24px 20px;
      filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.16));
    }

    .busche-note-pin {
      position: absolute;
      top: 10px;
      left: 16px;
      width: 12px;
      height: 12px;
      border-radius: 999px;
      background: radial-gradient(circle at 35% 35%, #fffae8 0 18%, #c53f36 22%, #922820 72%, #6f1e19 100%);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      z-index: 2;
    }

    .busche-note-title {
      position: absolute;
      top: 10px;
      left: 34px;
      font: 700 15px 'Patrick Hand', 'Comic Sans MS', cursive;
      color: #3d372c;
      letter-spacing: 0.02em;
      z-index: 2;
    }

    .busche-note-paper {
      position: relative;
      min-height: 176px;
      padding: 30px 12px 10px;
      background: linear-gradient(180deg, #f7e98b 0%, #f5e17c 100%);
      border: 1px solid rgba(106, 88, 38, 0.24);
      border-radius: 3px 3px 8px 3px;
      box-shadow: inset 0 -10px 18px rgba(185, 150, 48, 0.14);
      overflow: hidden;
    }

    .busche-note-paper::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.28), transparent 28%);
      pointer-events: none;
    }

    .busche-note-paper::after {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #fdf4b7 0%, #eddc79 70%);
      clip-path: polygon(0 0, 100% 0, 100% 100%);
      box-shadow: -1px 1px 0 rgba(120, 96, 33, 0.16);
    }

    .busche-note-svg-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
    }

    .busche-cross {
      width: 100%;
      height: 100%;
    }
  `;

    document.head.appendChild(style);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function hashSeed(key) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function jitter(key, min, max) {
    const seed = hashSeed(String(key));
    const t = (seed % 10000) / 10000;
    return min + (max - min) * t;
}

function shortLabel(name) {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([name, value]) => {
        el.setAttribute(name, String(value));
    });
    return el;
}

function createStroke(x1, y1, x2, y2, extra = {}) {
    return createSvgEl('line', {
        x1,
        y1,
        x2,
        y2,
        ...extra,
    });
}

function createText(x, y, text, attrs = {}) {
    const el = createSvgEl('text', {
        x,
        y,
        ...attrs,
    });
    el.textContent = text;
    return el;
}

function buildHandDrawnStyle(svg) {
    const defs = createSvgEl('defs');

    const filter = createSvgEl('filter', {
        id: 'busche-roughen',
        x: '-10%',
        y: '-10%',
        width: '120%',
        height: '120%',
    });

    filter.appendChild(createSvgEl('feTurbulence', {
        type: 'fractalNoise',
        baseFrequency: '0.85',
        numOctaves: '1',
        seed: '7',
        result: 'noise',
    }));

    filter.appendChild(createSvgEl('feDisplacementMap', {
        in: 'SourceGraphic',
        in2: 'noise',
        scale: '0.7',
        xChannelSelector: 'R',
        yChannelSelector: 'G',
    }));

    defs.appendChild(filter);
    svg.appendChild(defs);
}

function createArmGroup(direction) {
    return createSvgEl('g', {
        'data-arm': direction,
    });
}

function renderTicks(group, direction, count, armLength, seedPrefix) {
    const gap = 13;
    const start = 22;
    const shortSize = 9;
    const longSize = 18;

    for (let i = 0; i < count; i += 1) {
        const step = i + 1;
        const pos = start + (i * gap);
        if (pos > armLength - 10) break;

        const isFive = step % 5 === 0;
        const tickSize = isFive ? longSize : shortSize;
        const wobble = jitter(`${seedPrefix}-${step}`, -1.8, 1.8);
        const tilt = jitter(`${seedPrefix}-tilt-${step}`, -7, 7);

        let x1;
        let y1;
        let x2;
        let y2;

        if (direction === 'up' || direction === 'down') {
            const y = direction === 'up' ? -pos : pos;
            x1 = -tickSize / 2 + wobble;
            y1 = y - 0.5;
            x2 = tickSize / 2 + wobble;
            y2 = y + 0.5;
        } else {
            const x = direction === 'left' ? -pos : pos;
            x1 = x - 0.5;
            y1 = -tickSize / 2 + wobble;
            x2 = x + 0.5;
            y2 = tickSize / 2 + wobble;
        }

        const line = createStroke(x1, y1, x2, y2, {
            stroke: '#25334a',
            'stroke-width': isFive ? 2.8 : 2.2,
            'stroke-linecap': 'round',
            transform: `rotate(${tilt})`,
            filter: 'url(#busche-roughen)',
            'data-busca-index': String(i),
            'data-busca-value': String(step),
            'data-busca-milestone': isFive ? 'true' : 'false',
        });

        group.appendChild(line);
    }
}

function createArmLabel(group, direction, label, armLength, seedPrefix) {
    if (!label) return;
    let x = 0;
    let y = 0;

    if (direction === 'up') y = -(armLength + 20);
    if (direction === 'down') y = armLength + 28;
    if (direction === 'left') x = -(armLength + 28);
    if (direction === 'right') x = armLength + 18;

    const rotate = jitter(`${seedPrefix}-label-rot`, -5, 5);

    const text = createText(x, y, label, {
        'font-size': '26',
        'font-family': 'Patrick Hand, Gloria Hallelujah, cursive',
        fill: '#25334a',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        transform: `rotate(${rotate} ${x} ${y})`,
        'data-arm-label': direction,
    });

    group.appendChild(text);
}

export default class BuscheVisualizer {
    constructor(container, options = {}) {
        ensureBuscheVisualizerStyles();
        this.container = container;
        this.options = options;
        this.state = {
            players: {
                top: { label: '', busche: 0 },
                right: { label: '', busche: 0 },
                bottom: { label: '', busche: 0 },
                left: { label: '', busche: 0 },
            },
        };

        this.ensureShell();
        if (options.gameState) {
            this.setPlayersByState(options.gameState);
        } else {
            this.render();
        }
    }

    ensureShell() {
        this.container.classList.add('busche-note-slot');
        this.container.innerHTML = `
      <div class="busche-note" aria-live="polite">
        <div class="busche-note-pin" aria-hidden="true"></div>
        <div class="busche-note-title">Busche</div>
        <div class="busche-note-paper">
          <div class="busche-note-svg-wrap"></div>
        </div>
      </div>
    `;
        this.svgWrap = this.container.querySelector('.busche-note-svg-wrap');
    }

    setPlayersByState(gameState) {
        const labels = {
            top: shortLabel(gameState.players?.[2]?.name),
            right: shortLabel(gameState.players?.[3]?.name),
            bottom: shortLabel(gameState.players?.[0]?.name),
            left: shortLabel(gameState.players?.[1]?.name),
        };

        this.state.players.top.label = labels.top;
        this.state.players.right.label = labels.right;
        this.state.players.bottom.label = labels.bottom;
        this.state.players.left.label = labels.left;

        this.state.players.top.busche = gameState.players?.[2]?.busche || 0;
        this.state.players.right.busche = gameState.players?.[3]?.busche || 0;
        this.state.players.bottom.busche = gameState.players?.[0]?.busche || 0;
        this.state.players.left.busche = gameState.players?.[1]?.busche || 0;

        this.render();
    }

    updateFromSummary(summary, gameState) {
        if (!summary || !gameState) return;
        this.setPlayersByState(gameState);
    }

    getTickElement(arm, buscaIndex) {
        if (!this.svgWrap) return null;
        return this.svgWrap.querySelector(
            `[data-arm="${arm}"] [data-busca-index="${buscaIndex}"]`
        );
    }

    render() {
        this.svgWrap.innerHTML = '';

        const svg = createSvgEl('svg', {
            viewBox: '0 0 220 220',
            class: 'busche-cross',
            role: 'img',
            'aria-label': 'Segnapunti busche a croce',
        });

        buildHandDrawnStyle(svg);

        const root = createSvgEl('g', {
            transform: 'translate(110 110) rotate(-1.5)',
        });

        const armLength = 76;

        const cross = createSvgEl('g', {
            stroke: '#25334a',
            'stroke-width': '2.4',
            'stroke-linecap': 'round',
            filter: 'url(#busche-roughen)',
            'data-cross-core': 'true',
        });

        cross.appendChild(createStroke(0, -armLength, 0, armLength));
        cross.appendChild(createStroke(-armLength, 0, armLength, 0));
        root.appendChild(cross);

        const topGroup = createArmGroup('top');
        renderTicks(topGroup, 'up', clamp(this.state.players.top.busche, 0, 20), armLength, 'top');
        createArmLabel(topGroup, 'up', this.state.players.top.label, armLength, 'top');

        const rightGroup = createArmGroup('right');
        renderTicks(rightGroup, 'right', clamp(this.state.players.right.busche, 0, 20), armLength, 'right');
        createArmLabel(rightGroup, 'right', this.state.players.right.label, armLength, 'right');

        const bottomGroup = createArmGroup('bottom');
        renderTicks(bottomGroup, 'down', clamp(this.state.players.bottom.busche, 0, 20), armLength, 'bottom');
        createArmLabel(bottomGroup, 'down', this.state.players.bottom.label, armLength, 'bottom');

        const leftGroup = createArmGroup('left');
        renderTicks(leftGroup, 'left', clamp(this.state.players.left.busche, 0, 20), armLength, 'left');
        createArmLabel(leftGroup, 'left', this.state.players.left.label, armLength, 'left');

        root.appendChild(topGroup);
        root.appendChild(rightGroup);
        root.appendChild(bottomGroup);
        root.appendChild(leftGroup);

        svg.appendChild(root);
        this.svgWrap.appendChild(svg);
    }
}