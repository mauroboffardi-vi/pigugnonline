/**
 * Animazione di lancio di una carta verso il centro del tavolo.
 * Crea un clone dell'immagine, anima un arco con rotazione casuale
 * e lascia il clone nella posizione finale mantenendo la rotazione.
 *
 * @param {HTMLImageElement} img - immagine sorgente cliccata
 * @param {HTMLElement} container - area giocatore contenente la carta
 * @param {HTMLElement} centerElem - elemento della zona centrale del tavolo
 * @param {boolean} preferRight - preferenza di atterraggio verso destra
 * @param {number} zIndex - z-index base per l'animazione
 * @returns {Promise<HTMLImageElement>} il clone animato (resolto quando finisce l'animazione)
 */
export async function animateThrow(img, container, centerElem, preferRight = false, zIndex = 1000, startRect = null) {
    const rect = startRect || img.getBoundingClientRect();
    const clone = img.cloneNode(true);
    clone.classList.add('flying-card');
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.position = 'absolute';
    container.appendChild(clone);
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = zIndex;

    // Assicurati che centerElem sia posizionato e calcola il rettangolo
    const centerRect = centerElem.getBoundingClientRect();
    if (getComputedStyle(centerElem).position === 'static') {
        centerElem.style.position = 'relative';
    }

    // Calcola le coordinate relative di inizio (all'interno di centerElem) e aggiungi clone lì
    const startLeftRel = rect.left - centerRect.left;
    const startTopRel = rect.top - centerRect.top;
    clone.style.left = `${startLeftRel}px`;
    clone.style.top = `${startTopRel}px`;
    centerElem.appendChild(clone);

    // Determina la posizione finale targetX e targetY all'interno di centerElem
    const minX = preferRight ? Math.max(centerRect.width / 2, 10) : 10;
    const maxX = preferRight ? centerRect.width - 10 : Math.min(centerRect.width / 2, centerRect.width - 10);
    const targetX = Math.round(Math.random() * (maxX - minX) + minX);

    const minY = centerRect.height * 0.2;
    const maxY = centerRect.height * 0.8;
    const targetY = Math.round(Math.random() * (maxY - minY) + minY);

    // Calcola le differenze relative rispetto al rettangolo di centerElem
    const targetXRel = targetX - centerRect.width / 2;
    const targetYRel = targetY - centerRect.height / 2;
    const startX = startLeftRel;
    const startY = startTopRel;
    const dx = targetXRel - startX;
    const dy = targetYRel - startY;

    // Calcola la cima del parabola e l'angolo di rotazione
    const peak = Math.max(80, Math.min(200, Math.abs(dx) / 2 + 80));
    const midX = dx / 2 + (Math.random() * 40 - 20);
    const midY = dy / 2 - peak;

    const endRotate = (Math.random() * 40 - 20); // Angolo di rotazione finale
    const midRotate = endRotate / 2 + (Math.random() * 20 - 10);

    // Anima: Usa fill 'forwards' per mantenere l'ultimo frame
    const duration = Math.round(800 + Math.random() * 300);
    const anim = clone.animate([
        { transform: `translate(${startX}px, ${startY}px) rotate(0deg)`, offset: 0 },
        { transform: `translate(${midX}px, ${midY}px) rotate(${midRotate}deg)`, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${endRotate}deg)`, offset: 1 }
    ], {
        duration,
        easing: 'cubic-bezier(.22,.9,.32,1)',
        fill: 'forwards'
    });

    // Funzione finale per posizionare correttamente la carta dopo l'animazione
    function finalize() {
        try {
            const finalLeft = targetXRel; // Offset dal centro orizzontale
            const finalTop = targetYRel;  // Offset dal centro verticale

            // Rimuovi eventuali margini o padding che potrebbero influenzare il posizionamento
            clone.style.margin = '0';
            clone.style.padding = '0';

            // Imposta le nuove coordinate finale con forza utilizzando JavaScript
            clone.style.left = `${finalLeft}px`;
            clone.style.top = `${finalTop}px`;

            // Aggiorna altre proprietà per garantire che la carta rimanga posizionata correttamente
            clone.style.position = 'absolute';
            clone.style.zIndex = zIndex + 1000;
            clone.style.width = `${rect.width}px`;
            clone.style.height = `${rect.height}px`;
            clone.style.maxWidth = 'none';
            clone.style.display = 'block';
            clone.style.transform = `rotate(${endRotate}deg)`;

            // Aggiungi la classe finale per rimuovere gli eventi di puntatore
            clone.classList.add('played-card');
        } catch (err) {
            console.error('animateThrow finalize error', err);
        }
    }

    // Usa il promise della fine dell'animazione con un fallback temporale
    let finishedCalled = false;
    anim.finished.then(() => {
        finishedCalled = true;
        finalize();
    }).catch((e) => {
        console.error('animation failed', e);
    });

    setTimeout(() => {
        if (!finishedCalled) finalize();
    }, duration + 60);

    // Restituisci una promessa che si risolve al termine della finalizzazione
    return new Promise((resolve) => {
        setTimeout(() => resolve(clone), duration + 80);
    });
}

export default animateThrow;

/**
 * Two-phase animation: animate clone out of screen toward the edge determined by container,
 * then call `onOffscreen()` (e.g. to compact the hand), then animate clone back into
 * the table center and finalize it.
 *
 * @param {HTMLImageElement} img
 * @param {HTMLElement} container
 * @param {HTMLElement} centerElem
 * @param {boolean} preferRight
 * @param {number} zIndex
 * @param {DOMRect|null} startRect
 * @param {Function} onOffscreen - synchronous callback executed after clone is offscreen
 */
export async function animateOutIn(img, container, centerElem, preferRight = false, zIndex = 1000, startRect = null, onOffscreen = () => { }) {
    const rect = startRect || img.getBoundingClientRect();
    const clone = img.cloneNode(true);
    clone.classList.add('flying-card');
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.position = 'absolute';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = zIndex;
    // find nearest clipping ancestor (overflow != visible) to perform OUT animation inside it
    function findClipParent(el) {
        let cur = el;
        while (cur && cur !== document.body) {
            const s = getComputedStyle(cur);
            if (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible') return cur;
            cur = cur.parentElement;
        }
        return document.body;
    }

    const clipParent = findClipParent(container) || document.body;
    const clipRect = clipParent.getBoundingClientRect();
    // position clone relative to clipParent and append there so OUT is clipped
    const startLeftRel = rect.left - clipRect.left;
    const startTopRel = rect.top - clipRect.top;
    clone.style.left = startLeftRel + 'px';
    clone.style.top = startTopRel + 'px';
    clipParent.appendChild(clone);

    // compute off-target outside the clipParent (so it leaves the player's box)
    let outXRel = startLeftRel;
    let outYRel = startTopRel;
    const gap = Math.max(40, rect.height);
    if (container.classList.contains('bottom')) {
        outYRel = clipRect.height + gap;
    } else if (container.classList.contains('left')) {
        outXRel = -gap;
    } else if (container.classList.contains('top')) {
        outYRel = -gap;
    } else if (container.classList.contains('right')) {
        outXRel = clipRect.width + gap;
    } else {
        outYRel = clipRect.height + gap;
    }

    const dxOut = outXRel - startLeftRel;
    const dyOut = outYRel - startTopRel;
    const rotOut = (Math.random() * 40 - 20);

    // OUT animation: quick linear move offscreen (no parabola)
    const durationOut = Math.round(300 + Math.random() * 150);
    const animOut = clone.animate([
        { transform: `translate(0px,0px) rotate(0deg)`, offset: 0 },
        { transform: `translate(${dxOut}px, ${dyOut}px) rotate(${rotOut}deg)`, offset: 1 }
    ], { duration: durationOut, easing: 'linear', fill: 'forwards' });

    // wait for out animation
    try {
        await Promise.race([animOut.finished, new Promise(r => setTimeout(r, durationOut + 80))]);
    } catch (e) { /* ignore */ }

    // after OUT finished, move clone to body at its current viewport coords so IN can travel to center
    const curRect = clone.getBoundingClientRect();
    // remove from clipParent and append to body keeping absolute viewport coords
    try {
        clone.style.left = Math.round(curRect.left) + 'px';
        clone.style.top = Math.round(curRect.top) + 'px';
        clone.style.position = 'absolute';
        document.body.appendChild(clone);
    } catch (err) { console.error('move clone to body failed', err); }

    // call callback to compact hand / re-render
    try { onOffscreen(); } catch (err) { console.error('onOffscreen callback failed', err); }

    // compute final target inside centerElem (after re-render)
    const centerRect = centerElem.getBoundingClientRect();
    const minX = preferRight ? Math.max(centerRect.left + centerRect.width / 2, centerRect.left + 10) : centerRect.left + 10;
    const maxX = preferRight ? centerRect.right - 10 : Math.min(centerRect.left + centerRect.width / 2, centerRect.right - 10);
    const targetX = Math.round(Math.random() * (maxX - minX) + minX);
    const targetY = Math.round(Math.random() * (centerRect.height * 0.6)) + centerRect.top + centerRect.height * 0.2;

    const dxIn = targetX - curRect.left;
    const dyIn = targetY - curRect.top;
    const midXIn = dxIn / 2 + (Math.random() * 40 - 20);
    const midYIn = dyIn / 2 - Math.max(40, Math.abs(dxIn) / 2 + 40);
    const endRotate = (Math.random() * 40 - 20);
    const durationIn = Math.round(600 + Math.random() * 300);

    // IN animation: use a parabolic arc (via mid point) and easing
    const animIn = clone.animate([
        { transform: `translate(0px,0px) rotate(${rotOut}deg)`, offset: 0 },
        { transform: `translate(${midXIn}px, ${midYIn}px) rotate(${endRotate / 2}deg)`, offset: 0.5 },
        { transform: `translate(${dxIn}px, ${dyIn}px) rotate(${endRotate}deg)`, offset: 1 }
    ], { duration: durationIn, easing: 'cubic-bezier(.22,.9,.32,1)', fill: 'forwards' });

    console.log("carta finita in dx=" + dxIn + ", dyIn=" + dyIn);

    try {
        await Promise.race([animIn.finished, new Promise(r => setTimeout(r, durationIn + 80))]);
    } catch (e) { /* ignore */ }


    return clone;
}

/**
 * High-level API: play a card. Single.js can call this and provide an `onPlayed`
 * callback that updates game state (remove card from hand and re-render).
 * The animation internals (start rect capture, out/in sequence) are handled here.
 *
 * @param {HTMLImageElement} img
 * @param {HTMLElement} container
 * @param {HTMLElement} centerElem
 * @param {Object} opts
 * @param {Function} opts.onPlayed - called when the card is considered played (between out and in)
 * @param {number} opts.zIndex
 * @returns {Promise<HTMLImageElement>} clone
 */
export async function playCard(img, container, centerElem, opts = {}) {
    const { onPlayed = () => { }, zIndex = 1000, preferRight = container && container.classList ? container.classList.contains('right') : false } = opts;
    const startRect = img.getBoundingClientRect();

    const clone = await animateOutIn(img, container, centerElem, preferRight, zIndex, startRect, () => {
        try { onPlayed(); } catch (e) { console.error('onPlayed failed', e); }
    });

    return clone;
}
