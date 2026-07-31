# Roadmap progetto Pigugno

## Obiettivo
Mettere ordine nel progetto prima di aggiungere nuove feature pesanti. La priorità non è aggiungere altro codice, ma ridurre l'accoppiamento, separare le responsabilità e preparare una base che regga AI, multiplayer e UX aggiuntiva.

## BUGS
- (low) a volte le carte lanciate sul tavolo si sovrappongono troppo e quella sotto non si legge. Troppo complicato il drag and drop?
- (medium) la carte giocate sono fixed, modificando la dimensione della finestra stanno li. Come risolvere?
- fixed ~~(**blocker**) a volte si ferma e dice "nessuna carta giocabile" per il computer~~
- fixed ~~(**blocker**) Visto giocare il pigno di rifiuto di prima mano, dovrebbe essere impossibile~~


## Priorità 1, struttura del codice

### 1. Refactoring di `animation.js` - fatto
### 2. Riorganizzazione delle cartelle sorgenti - fatto

## Priorità 2, completare bene il single player

### 3a. pensare a un'indicatore del giocatore di turno

### 3. AI base del computer, miglioramenti
**Obiettivo:** introdurre una logica semplice, credibile e migliorabile.

### Altre idee possibili per strategie di mano

- Conservazione delle entrate: non consumare troppo presto le poche carte che ti permettono di rientrare in presa in un seme utile.

- Controllo del lead: distinguere quando vuoi assolutamente iniziare tu la prossima presa e quando invece vuoi evitarlo.

- Seconda presa minima controllata: se devi ancora coprire o prevedi prese inevitabili, meglio una presa piccola ora che una grossa forzata dopo.

- Sacrificio pianificato: accettare di perdere 1 presa “giusta” per migliorare la struttura del resto della mano.

- Protezione delle uscite: tenere almeno una carta innocua per uscire da situazioni bloccate nel finale.

- Gestione dei semi lunghi: non guardare solo i semi corti; un seme lungo ma medio può essere ottimo per drenare carte avversarie.

- Sblocco carte alte protette: se una carta alta è coperta da 2-3 carte sotto, valutare quando liberarla senza trasformarla in presa cattiva.

- Conteggio avversari vivi su un seme: stimare chi può ancora seguire un seme e chi invece potrà rifiutare. L’inferenza dalle carte viste è uno dei salti più utili in AI di trick-taking.

- Pressione su giocatore scoperto: se un avversario sembra corto in un seme, guidare il gioco lì per costringerlo a rifiuti scomodi.

- Preservazione dei vincenti veri: non spendere troppo presto carte che sono tra le poche prese quasi sicure della mano.

- Gestione dei punti latenti: non solo punti sulla carta, ma rischio futuro che quella carta si trasformi in presa tossica.

- Riconoscimento mano polarizzata: trattare diversamente mani “molto alte + molto basse” rispetto a mani tutte medie.

- Riconoscimento mano compressa: se le tue carte stanno tutte in fascia media, evitare linee troppo ambiziose e preferire flessibilità.

- Ducking intelligente: andare sotto apposta in un seme anche con carta quasi competitiva, per mantenere forma di mano o evitare il lead.

- Squeeze / compressione finale: nel finale, scegliere linee che forzano gli altri a consumare l’unico seme che li tiene vivi. Le posizioni di squeeze sono note anche nella teoria dei trick-taking a informazione perfetta.

#### Per strategia di mano, io darei priorità a queste

- Conservazione delle entrate

- Controllo del lead

- Seconda presa minima controllata

- Protezione delle uscite

- Conteggio avversari vivi per seme

- Pressione su giocatore corto

- Preservazione dei vincenti veri

- Gestione dei punti latenti

- Ducking intelligente

- Squeeze finale leggero

####roadmap pratica

- Step 1: controllo del lead + conservazione entrate.

- Step 2: seconda presa minima controllata + protezione uscite.

- Step 3: conteggio avversari vivi per seme.

- Step 4: squeeze finale leggero.

####Le più redditizie subito

- Controllo del lead, perché cambia tantissime decisioni anche senza search.

- Conservazione delle entrate, perché evita molti auto-sabotaggi di metà/fine mano.

- Seconda presa minima controllata, perché migliora i casi in cui oggi il bot ragiona troppo “presa per presa”.

- Conteggio avversari vivi per seme, perché rende molto più intelligenti rifiuti, void e decime.


Nota progettuale:

- Dare al computer visibilità perfetta di tutte le carte non giocate lo renderebbe troppo forte e poco naturale.
- Molto meglio un approccio a livelli: prima solo carte viste, poi eventualmente modalità “hard”.

**Risultato atteso:** un avversario semplice ma sensato, senza sporcare `GameState`.

### 4. Carte dei computer coperte - fatto

## Priorità 3, arricchimento dell'esperienza

### 5a. pensare a un'animazione della distribuzione delle carte
- distribuzione di 40 carte coperte con animazione dal lato del dealer
- "showdown" delle carte del giocatore Io

### 5. Suoni
**Obiettivo:** dare peso alle animazioni e agli eventi importanti.

- Aggiungere suoni leggeri per: lancio carta, presa, fine mano, Pigugno, eliminazione o superamento soglia busche.
- Gestire il tutto in un modulo dedicato, per esempio `soundManager.js`.
- Prevedere mute on/off nelle impostazioni o in un toggle semplice.
- Evitare suoni ridondanti o troppo frequenti.

**Risultato atteso:** feedback più vivo, senza trasformare il gioco in una slot machine.

### 6. Fumetti e commenti dinamici
**Obiettivo:** aggiungere carattere senza interferire col flusso di gioco.

- Introdurre hook o eventi semanticamente chiari nel `GameState` o in un event layer.
- Esempi: `onPigugnoTaken`, `onNoCapture`, `onBigBuscheSwing`, `onGameOverCandidate`.
- Creare un sistema UI non bloccante per mostrare fumetti temporanei sopra i giocatori.
- Tenere separata la logica di trigger dalla presentazione del fumetto.
- Definire un tono coerente e non eccessivamente ripetitivo.

**Risultato atteso:** più personalità, senza sporcare la logica principale.

## Priorità 4, preparare il salto a multiplayer

### 7. Analisi architetturale per multiplayer
**Obiettivo:** capire cosa del single player è davvero riusabile e cosa no.

Da chiarire prima di scrivere codice:

- Quali parti di `GameState` sono pure e possono restare comuni.
- Quali parti di `single.js` sono solo orchestration locale e andranno separate.
- Come rappresentare eventi di partita in modo serializzabile.
- Come gestire turni, sincronizzazione e ordine delle giocate.

Da fare:

- Separare il più possibile stato di dominio e side effect UI.
- Ridurre dipendenze dal DOM dentro la logica di partita.
- Valutare un event log o action log come fonte di verità della partita.

**Risultato atteso:** il multiplayer non nasce come copia sporca del single player.

### 8. Multiplayer peer-to-peer o quasi serverless
**Obiettivo:** esplorare un multiplayer con invito via URL senza backend tradizionale.

Temi da studiare:

- Creazione stanza e condivisione invito.
- Possibile uso di WebRTC per la connessione tra giocatori.
- Necessità di un minimo di signaling esterno, anche se non di un vero game server.
- Gestione host, riconnessione, abbandono partita e authoritative state.

Nota importante:

- “Senza server” quasi mai significa davvero senza alcun servizio esterno.
- Se ignori questo punto adesso, più avanti perderai tempo a rincorrere un'idea tecnicamente troppo ottimistica.

**Risultato atteso:** decisione realistica su fattibilità, complessità e limiti.

### 9. migrare a TypeScript?

## Note strategiche

- Non rendere l'AI “furba” prima di averla resa separata e testabile.
- Non aggiungere effetti collaterali narrativi come fumetti e suoni dentro `GameState`: quello è il modo più rapido per rovinarlo.
- Ogni nuova feature dovrebbe passare da una domanda semplice: è logica di dominio, presentazione, o orchestrazione?

## Backlog aperto

- Ripulire eventuale dead code lasciato dal refactoring delle animazioni.
- Cercare funzioni o moduli che leggono o modificano stato di altri componenti direttamente.
- Valutare introduzione di test minimi sulle regole di gioco e sul calcolo busche.
- Documentare API interne dei moduli principali prima che il progetto cresca ancora.
- Migliorare naming convention per Trick, TrickEntry[] e TrickEntry[][]
- stabilire un tipo suit condiviso
- finestra about e display del numero di versione
- estrarre evaluate* e altri helper da ComputerPlayer