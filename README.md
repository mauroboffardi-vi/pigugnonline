# Pigugno

Implementazione in JavaScript del gioco di carte Pigugno, con focus su regole di partita, animazioni di tavolo e interfaccia leggera lato client. Il progetto è in costruzione, ma la base attuale copre già flusso di mano, conteggio punti, calcolo busche, reveal del Pigugno e schermata di fine mano.[cite:280][cite:289]

## Stato del progetto

Il progetto è una versione giocabile single player locale, con logica di gioco già separata in buona parte dalla UI. Negli ultimi aggiornamenti sono stati sistemati il conteggio e la visualizzazione incrementale delle busche, la regola del sette di denari sulla prima mano, e la regola per cui nelle mani successive distribuisce chi ha preso il Pigugno e inizia il giocatore successivo.[cite:282][cite:289]

## Funzionalità attuali

- Gestione di una partita completa a mani successive.[cite:289]
- Regole principali del Pigugno già implementate nel `GameState`.[cite:287][cite:294]
- Calcolo punti, prese, busche e stato di game over.[cite:282]
- Animazioni tavolo e riepilogo di fine mano.[cite:290][cite:293]
- Visualizzazione busche con notazione corretta: 5 pallini, una tacca, altri 5 pallini, poi croce di uscita.[cite:282][cite:292]
- Bottoni e preset di test separati in file dedicato, rimovibile senza sporcare il flusso principale.[cite:285][cite:291]

## Regole già chiarite nel codice

Alcune regole del gioco sono state fonte di bug e quindi conviene fissarle qui in modo esplicito:

- Nella prima mano inizia il giocatore che possiede il sette di denari.[cite:289]
- Nelle mani successive mescola e distribuisce chi ha preso il Pigugno; la mano parte dal giocatore successivo.[cite:289]
- Il Pigugno non può essere giocato in apertura della prima mano della partita.[cite:287]
- Il Pigugno resta comunque una carta normale; quando si risponde a spade nella prima mano, può essere giocato solo se è l'unica spada rimasta in mano.[cite:287][cite:294]

## Struttura del progetto

La struttura è in fase di riordino. L'obiettivo è separare in modo chiaro dominio, UI, entrypoint applicativi e strumenti di debug, evitando di mescolare regole di gioco, componenti grafici e file di test nello stesso punto del progetto.[cite:280][cite:284]

Direzione consigliata:

```text
src/
  app/
  domain/
    game/
    cards/
    players/
  ui/
    overlays/
    animations/
    visualizers/
  assets/
  styles/
  dev/
    test/
```

Scelte di naming consigliate:

- `PascalCase` per classi e componenti.
- `kebab-case` per moduli funzione, script, entrypoint e file di test.
- Niente mix casuale tra camelCase, snake_case e PascalCase nei nomi file.[cite:280]

## Componenti principali

### `GameState`
Gestisce lo stato della partita e le regole del dominio: mani, prese, punti, busche, turni e game over. È il centro della logica di gioco e dovrebbe restare separato dalla UI.[cite:287]

### Busche tracker
Il componente busche è stato ripulito di recente: i mapping interni non sono più esposti all'esterno e la UI usa un'API più leggibile per aggiornare e marcare le busche. La terminologia del componente è ancora affinabile, ma la responsabilità adesso è più chiara.[cite:280][cite:282]

### Animazioni
Le animazioni di tavolo e quelle di riepilogo mano sono state separate. In particolare il reveal del Pigugno e l'aggiornamento progressivo delle busche sono stati corretti per seguire il flusso di fine mano in modo più leggibile.[cite:290][cite:293]

## Test e debug

Per i test rapidi di scoring e fine mano viene usato un file separato `test_buttons.js`, caricato solo quando serve. Questa scelta è intenzionale: il codice di test deve poter sparire togliendo un solo script dall'HTML, senza lasciare spazzatura nel codice runtime.[cite:285][cite:291]

## Roadmap breve

Priorità attuali:

2. AI single player migliorata per gestione del Pigugno e strategia di Gioco (calcolata sul numero di busche dei giocatori)
4. Suoni associati agli eventi principali.
5. Fumetti o dialoghi contestuali dei giocatori.
6. Valutazione seria del multiplayer e della sua architettura.[cite:280]

## Note di sviluppo

Il progetto è volutamente pratico: prima si fissano regole, flusso e leggibilità del codice, poi si aggiungono feature più costose come AI avanzata o multiplayer. In altre parole, niente architettura finta: le modifiche devono risolvere problemi veri o preparare i prossimi passi in modo concreto.[cite:284]

### 🛠 Modalità Debug & Strategia AI

Il progetto include una modalità di debug nascosta, pensata per facilitare lo sviluppo e analizzare il comportamento del gioco senza inquinare l'interfaccia di produzione. Per attivarla, è sufficiente aggiungere il parametro `?debug=true` alla fine dell'URL (ad esempio: `.../single.html?debug=true`).

Una volta attivata questa modalità:
- **Carte scoperte:** Le carte in mano al computer verranno mostrate scoperte, rimuovendo la "nebbia di guerra".
- **Pannello di Test:** Verrà iniettato dinamicamente un menu in sovrimpressione contenente i bottoni per testare specifici scenari di gioco.
- **I "pensieri" dell'AI:** Aprendo la *Developer Console* del browser (tasto `F12`), potrai leggere in tempo reale i log con il ragionamento e la strategia elaborata dall'intelligenza artificiale. Questo permette di capire esattamente come l'avversario virtuale valuta il tavolo e sceglie quale carta giocare.