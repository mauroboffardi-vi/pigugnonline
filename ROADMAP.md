# Roadmap progetto Pigugno

## Obiettivo
Mettere ordine nel progetto prima di aggiungere nuove feature pesanti. La priorità non è aggiungere altro codice, ma ridurre l'accoppiamento, separare le responsabilità e preparare una base che regga AI, multiplayer e UX aggiuntiva.

## Priorità 1, struttura del codice

### 1. Refactoring di `animation.js` - fatto
### 2. Riorganizzazione delle cartelle sorgenti - fatto

## Priorità 2, completare bene il single player

### 3a. pensare a un'indicatore del giocatore di turno

### 3. AI base del computer
**Obiettivo:** introdurre una logica semplice, credibile e migliorabile.

- Creare un file separato, per esempio `ComputerPlayer.js`.
- Definire una API chiara, per esempio `chooseCard(gameState, playerId)`.
- Partire con una strategia semplice e deterministica, non con una pseudo AI troppo ambiziosa.
- Far rispettare sempre le regole già presenti in `GameState.canPlayCard()`.
- Separare il motore decisionale dalla UI e dalle animazioni.

Prima versione consigliata:

- Se il giocatore deve rispondere a seme, scegliere tra le carte valide di quel seme.
- Se può scartare, scegliere la carta meno costosa o meno rischiosa.
- Evitare di giocare il Pigugno quando è chiaramente sconveniente, se possibile.
- Tenere traccia delle carte già giocate come memoria pubblica della mano.

Nota progettuale:

- Dare al computer visibilità perfetta di tutte le carte non giocate lo renderebbe troppo forte e poco naturale.
- Molto meglio un approccio a livelli: prima solo carte viste, poi eventualmente modalità “hard”.

**Risultato atteso:** un avversario semplice ma sensato, senza sporcare `GameState`.

### 4. Carte dei computer coperte
**Obiettivo:** correggere una mancanza forte di UX e coerenza di gioco.

- Mostrare il retro delle carte dei giocatori computer invece del fronte.
- Al momento della giocata, sostituire temporaneamente il retro con la carta reale solo nell'animazione verso il tavolo.
- Verificare che il reveal non rompa né click handling né animazioni esistenti.
- Tenere la carta reale disponibile nel modello, ma non nel rendering costante della mano avversaria.

**Risultato atteso:** il gioco sembra davvero un gioco di carte, non un debugger visivo.

## Priorità 3, arricchimento dell'esperienza

### 5a. pensare a un'animazione della distribuzione delle carte
- distribuzione di 40 carte coperte con animazione dal lato del dealer
- "showdown" delle carte del giocatore Tu

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


## Note strategiche

- Non rendere l'AI “furba” prima di averla resa separata e testabile.
- Non aggiungere effetti collaterali narrativi come fumetti e suoni dentro `GameState`: quello è il modo più rapido per rovinarlo.
- Ogni nuova feature dovrebbe passare da una domanda semplice: è logica di dominio, presentazione, o orchestrazione?

## Backlog aperto

- Ripulire eventuale dead code lasciato dal refactoring delle animazioni.
- Cercare funzioni o moduli che leggono o modificano stato di altri componenti direttamente.
- Valutare introduzione di test minimi sulle regole di gioco e sul calcolo busche.
- Documentare API interne dei moduli principali prima che il progetto cresca ancora.
