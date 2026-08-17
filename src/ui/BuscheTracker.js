import { GameState } from "../domain/game/GameState.js";
/** @typedef {import('../ui-types').HandSummary} HandSummary */
/** @typedef {import('../ui-types').HandSummaryPlayer} HandSummaryPlayer */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @typedef {'top' | 'right' | 'bottom' | 'left'} BuscheArm
 */

/**
 * @typedef {{ label: string, busche: number }} BuschePlayerState
 */

/**
 * @typedef {{
 *   players: Record<BuscheArm, BuschePlayerState>
 * }} BuscheTrackerState
 */

/**
 * @typedef {{
 *   playerId: number,
 *   name?: string,
 *   busche?: number
 * }} BuscheTrackerPlayerLike
 */

/**
 * @typedef {{
 *   players?: BuscheTrackerPlayerLike[]
 * }} BuscheTrackerGameStateLike
 */

/**
 * @typedef {{
 *   playerId: number,
 *   name?: string,
 *   buscheAfterHand?: number,
 *   buscheEarned?: number
 * }} BuscheSummaryPlayerLike
 */

/**
 * @typedef {{
 *   players?: BuscheSummaryPlayerLike[]
 * }} BuscheSummaryLike
 */

/**
 * @typedef {{
 *   gameState?: BuscheTrackerGameStateLike | null
 * }} BuscheTrackerOptions
 */

/**
 * @param {string} key
 * @returns {number}
 */
function hashSeed(key) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/**
 * @param {string} key
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function jitter(key, min, max) {
    const seed = hashSeed(String(key));
    const t = (seed % 10000) / 10000;
    return min + (max - min) * t;
}

/**
 * @param {string} tag
 * @param {Record<string, string | number>} [attrs={}]
 * @returns {SVGElement}
 */
function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([name, value]) => {
        el.setAttribute(name, String(value));
    });
    return el;
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {Record<string, string | number>} [extra={}]
 * @returns {SVGElement}
 */
function createStroke(x1, y1, x2, y2, extra = {}) {
    return createSvgEl('line', {
        x1,
        y1,
        x2,
        y2,
        ...extra,
    });
}

/**
 * @param {number} x
 * @param {number} y
 * @param {string} text
 * @param {Record<string, string | number>} [attrs={}]
 * @returns {SVGElement}
 */
function createText(x, y, text, attrs = {}) {
    const el = createSvgEl('text', {
        x,
        y,
        ...attrs,
    });
    el.textContent = text;
    return el;
}

/**
 * @param {SVGElement} svg
 * @returns {void}
 */
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

/**
 * @param {BuscheArm} direction
 * @returns {SVGElement}
 */
function createArmGroup(direction) {
    return createSvgEl('g', {
        'data-arm': direction,
    });
}

/**
 * @param {SVGElement} group
 * @param {number} cx
 * @param {number} cy
 * @param {string} seedPrefix
 * @param {number} radius
 * @returns {void}
 */
function renderBuscheDot(group, cx, cy, seedPrefix, radius) {
    const dx1 = jitter(`${seedPrefix}-dx1`, -0.55, 0.55);
    const dy1 = jitter(`${seedPrefix}-dy1`, -0.55, 0.55);
    const dx2 = jitter(`${seedPrefix}-dx2`, -0.55, 0.55);
    const dy2 = jitter(`${seedPrefix}-dy2`, -0.55, 0.55);
    const r1 = radius + jitter(`${seedPrefix}-r1`, -0.30, 0.30);
    const r2 = radius + jitter(`${seedPrefix}-r2`, -0.42, 0.42);

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
        'stroke-width': '1.1',
        'stroke-linecap': 'round',
        filter: 'url(#busche-roughen)',
        opacity: '0.72',
    });

    group.appendChild(c1);
    group.appendChild(c2);
}

/**
 * @param {SVGElement} group
 * @param {'up' | 'down' | 'left' | 'right'} direction
 * @param {number} count
 * @param {number} armLength
 * @param {string} seedPrefix
 * @returns {void}
 */
function renderBuscheMarks(group, direction, count, armLength, seedPrefix) {
    const visibleDots = Math.min(Math.max(0, count), 10);
    const gap = 8;
    const start = 10;
    const dotRadius = 2.35;

    for (let i = 0; i < visibleDots; i += 1) {
        const step = i + 1;
        const pos = start + (i * gap);

        const mark = createSvgEl('g', {
            'data-busca-index': String(i),
            'data-busca-value': String(step),
            'data-busca-milestone': 'false',
        });

        if (direction === 'up' || direction === 'down') {
            const y = direction === 'up' ? -pos : pos;
            renderBuscheDot(mark, 0, y, `${seedPrefix}-dot-${step}`, dotRadius);
        } else {
            const x = direction === 'left' ? -pos : pos;
            renderBuscheDot(mark, x, 0, `${seedPrefix}-dot-${step}`, dotRadius);
        }

        group.appendChild(mark);
    }

    if (visibleDots >= 5) {
        const separatorPos = start + (5 * gap) - (gap * 0.35);

        if (direction === 'up' || direction === 'down') {
            const y = direction === 'up' ? -separatorPos : separatorPos;
            renderBuscheSeparator(group, 0, y, 'vertical', `${seedPrefix}-sep-5`);
        } else {
            const x = direction === 'left' ? -separatorPos : separatorPos;
            renderBuscheSeparator(group, x, 0, 'horizontal', `${seedPrefix}-sep-5`);
        }
    }
}

/**
 * @param {SVGElement} group
 * @param {number} cx
 * @param {number} cy
 * @param {'vertical' | 'horizontal'} orientation
 * @param {string} seedPrefix
 * @returns {void}
 */
function renderBuscheSeparator(group, cx, cy, orientation, seedPrefix) {
    const wobble = jitter(`${seedPrefix}-wobble`, -0.8, 0.8);
    const tilt = jitter(`${seedPrefix}-tilt`, -10, 10);
    const length = 20 + jitter(`${seedPrefix}-len`, 2, 6);

    let x1;
    let y1;
    let x2;
    let y2;
    const pivotX = cx;
    const pivotY = cy;

    if (orientation === 'vertical') {
        x1 = cx - length / 2;
        y1 = cy + 1.8 + wobble;
        x2 = cx + length / 2;
        y2 = cy - 1.2 + wobble;
    } else {
        x1 = cx + 1.8 + wobble;
        y1 = cy - length / 2;
        x2 = cx - 1.2 + wobble;
        y2 = cy + length / 2;
    }

    const line = createStroke(x1, y1, x2, y2, {
        stroke: '#25334a',
        'stroke-width': '2.6',
        'stroke-linecap': 'round',
        transform: `rotate(${tilt} ${pivotX} ${pivotY})`,
        filter: 'url(#busche-roughen)',
        'data-busche-separator': 'true',
    });

    group.appendChild(line);
}

/**
 * @param {SVGElement} group
 * @param {'up' | 'down' | 'left' | 'right'} direction
 * @param {number} totalBusche
 * @param {number} armLength
 * @param {string} seedPrefix
 * @returns {void}
 */
function createArmEndCross(group, direction, totalBusche, armLength, seedPrefix) {
    if (totalBusche < 10) return;

    let cx = 0;
    let cy = 0;
    const offset = armLength - 2;

    if (direction === 'up') cy = -offset;
    if (direction === 'down') cy = offset;
    if (direction === 'left') cx = -offset;
    if (direction === 'right') cx = offset;

    const size = 7.5 + jitter(`${seedPrefix}-out-size`, -1.2, 2.2);

    const g = createSvgEl('g', {
        'data-out-cross': direction,
    });

    g.appendChild(createStroke(
        cx - size,
        cy - size,
        cx + size,
        cy + size,
        {
            stroke: '#25334a',
            'stroke-width': '2.8',
            'stroke-linecap': 'round',
            transform: `rotate(${jitter(`${seedPrefix}-out-a`, -12, 12)} ${cx} ${cy})`,
            filter: 'url(#busche-roughen)',
        }
    ));

    g.appendChild(createStroke(
        cx - size,
        cy + size,
        cx + size,
        cy - size,
        {
            stroke: '#25334a',
            'stroke-width': '2.3',
            'stroke-linecap': 'round',
            transform: `rotate(${jitter(`${seedPrefix}-out-b`, -12, 12)} ${cx} ${cy})`,
            filter: 'url(#busche-roughen)',
        }
    ));

    group.appendChild(g);
}

/**
 * @param {SVGElement} group
 * @param {'up' | 'down' | 'left' | 'right'} direction
 * @param {string} label
 * @param {number} armLength
 * @param {string} seedPrefix
 * @returns {void}
 */
function createArmLabel(group, direction, label, armLength, seedPrefix) {
    if (!label) return;

    let x = 0;
    let y = 0;
    let rotation = 0;

    if (direction === 'up') {
        y = -(armLength + 16);
        rotation = jitter(`${seedPrefix}-label-rot`, -2, 2);
    }
    if (direction === 'down') {
        y = armLength + 16;
        rotation = jitter(`${seedPrefix}-label-rot`, -2, 2);
    }
    if (direction === 'left') {
        x = -(armLength + 16);
        rotation = -90 + jitter(`${seedPrefix}-label-rot`, -2, 2);
    }
    if (direction === 'right') {
        x = armLength + 16;
        rotation = 90 + jitter(`${seedPrefix}-label-rot`, -2, 2);
    }

    const text = createText(x, y, label, {
        fill: '#25334a',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        transform: `rotate(${rotation} ${x} ${y})`,
        'data-arm-label': direction,
    });

    group.appendChild(text);
}

/** @type {Record<number, BuscheArm>} */
const PLAYER_ID_TO_ARM = {
    2: 'top',
    3: 'right',
    0: 'bottom',
    1: 'left',
};

/** @type {Record<BuscheArm, number>} */
const ARM_TO_PLAYER_ID = {
    top: 2,
    right: 3,
    bottom: 0,
    left: 1,
};

export default class BuscheTracker {
    /**
     * @param {HTMLElement} container
     * @param {GameState} gameState
     */
    constructor(container, gameState) {
        if (!container) {
            throw new Error('BuscheTracker: container mancante');
        }

        /** @type {HTMLElement} */
        this.container = container;

        this.gameState = gameState;

        /** @type {HTMLDivElement | null} */
        this.svgWrap = null;

        /** @type {BuscheTrackerState} */
        this.state = {
            players: {
                top: { label: '', busche: 0 },
                right: { label: '', busche: 0 },
                bottom: { label: '', busche: 0 },
                left: { label: '', busche: 0 },
            },
        };

        this.ensureShell();

        if (this.gameState) {
            this.setPlayersByState(this.gameState);
        } else {
            this.render();
        }
    }

    /**
     * @returns {void}
     */
    ensureShell() {
        this.container.classList.add('busche-note-slot');
        this.container.innerHTML = `
      <div class="busche-note" aria-live="polite">
        <div class="busche-note-paper">
          <div class="busche-note-svg-wrap"></div>
        </div>
      </div>
    `;
        this.svgWrap = /** @type {HTMLDivElement | null} */ (
            this.container.querySelector('.busche-note-svg-wrap')
        );
    }

    /**
     * @param {GameState} gameState
     * @returns {void}
     */
    setPlayersByState(gameState) {
        if (!gameState || !Array.isArray(gameState.players)) return;

        console.debug('BuscheTracker players', gameState.players);
        console.debug('top player', gameState.players?.[2]);
        console.debug('right player', gameState.players?.[3]);
        console.debug('bottom player', gameState.players?.[0]);
        console.debug('left player', gameState.players?.[1]);

        this.gameState = gameState;

        Object.entries(ARM_TO_PLAYER_ID).forEach(([arm, playerId]) => {
            const typedArm = /** @type {BuscheArm} */ (arm);
            const player = gameState.players?.[playerId];
            const busche = Math.max(0, Number(player?.busche) || 0);
            const baseName = (player?.name || '').trim();
            const label = busche >= 10 ? `${baseName} (${busche})` : baseName;

            this.state.players[typedArm] = {
                label,
                busche,
            };
        });

        this.render();
    }

    /**
     * @param {HandSummary} summary
     * @param {GameState} [gameState]
     * @returns {void}
     *
    updateFromSummary(summary, gameState) {
        if (gameState) {
            this.setPlayersByState(gameState);
            return;
        }

        if (!summary || !Array.isArray(summary.players)) return;

        summary.players.forEach((playerSummary) => {
            const playerId = playerSummary.playerId;
            const arm = PLAYER_ID_TO_ARM[playerId];
            if (!arm) return;

            const busche = Math.max(0, Number(playerSummary.buscheAfterHand ?? playerSummary.buscheEarned ?? 0) || 0);
            const baseName = (playerSummary.name || '').trim();
            const label = busche >= 10 ? `${baseName} (${busche})` : baseName;

            this.state.players[arm] = {
                label,
                busche,
            };
        });

        this.render();
    }
        */

    /**
     * @param {number} playerId
     * @param {number} value
     * @returns {void}
     */
    setPlayerBusche(playerId, value) {
        const arm = PLAYER_ID_TO_ARM[playerId];
        if (!arm) return;

        const normalized = Math.max(0, Number(value) || 0);
        const current = this.state.players[arm] || { label: '', busche: 0 };
        const baseLabel = this.extractBaseLabel(current.label);

        this.state.players[arm] = {
            ...current,
            label: normalized >= 10 && baseLabel ? `${baseLabel} (${normalized})` : baseLabel,
            busche: normalized,
        };

        this.render();
    }

    /**
     * @param {number} playerId
     * @param {number} [amount=1]
     * @returns {void}
     */
    incrementPlayerBusche(playerId, amount = 1) {
        const current = this.getPlayerBusche(playerId);
        this.setPlayerBusche(playerId, current + amount);
    }

    /**
     * @param {number} playerId
     * @returns {number}
     */
    getPlayerBusche(playerId) {
        const arm = PLAYER_ID_TO_ARM[playerId];
        if (!arm) return 0;
        return Math.max(0, Number(this.state.players[arm]?.busche) || 0);
    }

    /**
     * @param {number} playerId
     * @param {string} label
     * @returns {void}
     */
    setPlayerLabel(playerId, label) {
        const arm = PLAYER_ID_TO_ARM[playerId];
        if (!arm) return;

        const current = this.state.players[arm] || { label: '', busche: 0 };
        const busche = Math.max(0, Number(current.busche) || 0);
        const baseLabel = (label || '').trim();

        this.state.players[arm] = {
            ...current,
            label: busche >= 10 && baseLabel ? `${baseLabel} (${busche})` : baseLabel,
        };

        this.render();
    }

    /**
     * @param {string} label
     * @returns {string}
     */
    extractBaseLabel(label) {
        return String(label || '').replace(/\s*\(\d+\)\s*$/, '').trim();
    }

    /**
     * @param {BuscheArm} arm
     * @param {number} buscaIndex
     * @returns {Element | null}
     */
    getTickElement(arm, buscaIndex) {
        if (!this.svgWrap) return null;
        return this.svgWrap.querySelector(
            `[data-arm="${arm}"] [data-busca-index="${buscaIndex}"]`
        );
    }

    /**
     * @param {number} playerId
     * @param {number} value
     * @returns {void}
     */
    markBusca(playerId, value) {
        const arm = PLAYER_ID_TO_ARM[playerId];
        if (!arm) return;

        const index = Number(value) - 1;
        if (index < 0) return;

        const mark = this.getTickElement(arm, index);
        if (!mark) return;

        mark.animate(
            [
                { opacity: 0.15, transform: 'scale(0.35)' },
                { opacity: 1, transform: 'scale(1.45)', offset: 0.72 },
                { opacity: 1, transform: 'scale(1)' },
            ],
            {
                duration: 280,
                easing: 'cubic-bezier(0.2, 1.4, 0.2, 1)',
                fill: 'forwards',
            }
        );
    }

    /**
     * @returns {void}
     */
    render() {
        if (!this.svgWrap) return;

        this.svgWrap.innerHTML = '';

        const svg = createSvgEl('svg', {
            viewBox: '0 0 270 270',
            class: 'busche-cross',
            role: 'img',
            'aria-label': 'Segnapunti busche a croce',
            overflow: 'visible',
        });

        buildHandDrawnStyle(svg);

        const root = createSvgEl('g', {
            transform: 'translate(135 135) rotate(-1.5)',
        });

        const armLength = 100;

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
        renderBuscheMarks(topGroup, 'up', this.state.players.top.busche, armLength, 'top');
        createArmEndCross(topGroup, 'up', this.state.players.top.busche, armLength, 'top');
        createArmLabel(topGroup, 'up', this.state.players.top.label, armLength, 'top');

        const rightGroup = createArmGroup('right');
        renderBuscheMarks(rightGroup, 'right', this.state.players.right.busche, armLength, 'right');
        createArmEndCross(rightGroup, 'right', this.state.players.right.busche, armLength, 'right');
        createArmLabel(rightGroup, 'right', this.state.players.right.label, armLength, 'right');

        const bottomGroup = createArmGroup('bottom');
        renderBuscheMarks(bottomGroup, 'down', this.state.players.bottom.busche, armLength, 'bottom');
        createArmEndCross(bottomGroup, 'down', this.state.players.bottom.busche, armLength, 'bottom');
        createArmLabel(bottomGroup, 'down', this.state.players.bottom.label, armLength, 'bottom');

        const leftGroup = createArmGroup('left');
        renderBuscheMarks(leftGroup, 'left', this.state.players.left.busche, armLength, 'left');
        createArmEndCross(leftGroup, 'left', this.state.players.left.busche, armLength, 'left');
        createArmLabel(leftGroup, 'left', this.state.players.left.label, armLength, 'left');

        root.appendChild(topGroup);
        root.appendChild(rightGroup);
        root.appendChild(bottomGroup);
        root.appendChild(leftGroup);

        svg.appendChild(root);
        this.svgWrap.appendChild(svg);
    }
}