const SVG_NS = 'http://www.w3.org/2000/svg';

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
        renderBuscheMarks(topGroup, 'up', clamp(this.state.players.top.busche, 0, 20), armLength, 'top');
        createArmLabel(topGroup, 'up', this.state.players.top.label, armLength, 'top');

        const rightGroup = createArmGroup('right');
        renderBuscheMarks(rightGroup, 'right', clamp(this.state.players.right.busche, 0, 20), armLength, 'right');
        createArmLabel(rightGroup, 'right', this.state.players.right.label, armLength, 'right');

        const bottomGroup = createArmGroup('bottom');
        renderBuscheMarks(bottomGroup, 'down', clamp(this.state.players.bottom.busche, 0, 20), armLength, 'bottom');
        createArmLabel(bottomGroup, 'down', this.state.players.bottom.label, armLength, 'bottom');

        const leftGroup = createArmGroup('left');
        renderBuscheMarks(leftGroup, 'left', clamp(this.state.players.left.busche, 0, 20), armLength, 'left');
        createArmLabel(leftGroup, 'left', this.state.players.left.label, armLength, 'left');

        root.appendChild(topGroup);
        root.appendChild(rightGroup);
        root.appendChild(bottomGroup);
        root.appendChild(leftGroup);

        svg.appendChild(root);
        this.svgWrap.appendChild(svg);
    }
}


function renderBuscheMarks(group, direction, count, armLength, seedPrefix) {
    const gap = 13;
    const start = 22;
    const dotRadius = 2.7;
    const barLengthBase = dotRadius * 6;

    for (let i = 0; i < count; i += 1) {
        const step = i + 1;
        const pos = start + (i * gap);
        if (pos > armLength - 10) break;

        const isMilestone = step % 5 === 0;
        const mark = createSvgEl('g', {
            'data-busca-index': String(i),
            'data-busca-value': String(step),
            'data-busca-milestone': isMilestone ? 'true' : 'false',
        });

        if (direction === 'up' || direction === 'down') {
            const y = direction === 'up' ? -pos : pos;
            if (isMilestone) {
                renderBuscheBar(mark, 0, y, 'vertical', `${seedPrefix}-${step}`, barLengthBase);
            } else {
                renderBuscheDot(mark, 0, y, `${seedPrefix}-${step}`, dotRadius);
            }
        } else {
            const x = direction === 'left' ? -pos : pos;
            if (isMilestone) {
                renderBuscheBar(mark, x, 0, 'horizontal', `${seedPrefix}-${step}`, barLengthBase);
            } else {
                renderBuscheDot(mark, x, 0, `${seedPrefix}-${step}`, dotRadius);
            }
        }

        group.appendChild(mark);
    }
}

function renderBuscheDot(group, cx, cy, seedPrefix, radius) {
    const dx1 = jitter(`${seedPrefix}-dx1`, -0.6, 0.6);
    const dy1 = jitter(`${seedPrefix}-dy1`, -0.6, 0.6);
    const dx2 = jitter(`${seedPrefix}-dx2`, -0.6, 0.6);
    const dy2 = jitter(`${seedPrefix}-dy2`, -0.6, 0.6);
    const r1 = radius + jitter(`${seedPrefix}-r1`, -0.35, 0.35);
    const r2 = radius + jitter(`${seedPrefix}-r2`, -0.45, 0.45);

    const c1 = createSvgEl('circle', {
        cx: cx + dx1,
        cy: cy + dy1,
        r: r1,
        fill: 'none',
        stroke: '#25334a',
        'stroke-width': '1.7',
        'stroke-linecap': 'round',
        filter: 'url(#busche-roughen)',
        opacity: '0.95',
    });

    const c2 = createSvgEl('circle', {
        cx: cx + dx2,
        cy: cy + dy2,
        r: r2,
        fill: 'none',
        stroke: '#25334a',
        'stroke-width': '1.15',
        'stroke-linecap': 'round',
        filter: 'url(#busche-roughen)',
        opacity: '0.75',
    });

    group.appendChild(c1);
    group.appendChild(c2);
}

function renderBuscheBar(group, cx, cy, orientation, seedPrefix, baseLength) {
    const wobble = jitter(`${seedPrefix}-wobble`, -1.2, 1.2);
    const tilt = jitter(`${seedPrefix}-tilt`, -6, 6);
    const length = baseLength + jitter(`${seedPrefix}-len`, -2.5, 2.5);

    let x1;
    let y1;
    let x2;
    let y2;

    if (orientation === 'vertical') {
        x1 = cx + wobble;
        y1 = cy - length / 2;
        x2 = cx + wobble;
        y2 = cy + length / 2;
    } else {
        x1 = cx - length / 2;
        y1 = cy + wobble;
        x2 = cx + length / 2;
        y2 = cy + wobble;
    }

    const line = createStroke(x1, y1, x2, y2, {
        stroke: '#25334a',
        'stroke-width': '2.6',
        'stroke-linecap': 'round',
        transform: `rotate(${tilt} ${cx} ${cy})`,
        filter: 'url(#busche-roughen)',
    });

    group.appendChild(line);
}