## 17 Aug: 
- cambiato il senso di gioco da orario ad antiorario, centralizzata la logica dell'ordine dentro GameState
- conversione del progetto da js puro a Typescript
## 18 Aug: 
- centralizzato il seme delle carte nell'oggetto Suit / Suits
## 19 Aug: 
- Creato Event Bus e sound Manager, aggiunto audio per il gioco delle carte e della presa.
- Aggiunti eventi ed audio per il segnare delle busche, e il mostrare le carte con i punti
## 20 Aug: 
- Risolto bug dell'audio via overlay "click to start"
- Sostituito il rumore delle carte giocate con un suono piú discreto e scelto random fra 9
- aggiustato il relative path degli asset per farlo funzionare sia in locale che sull'host www.boffardi.net , e creato script di deploy
- aggiunto "about" nella index con numero/data di versione automatico
## 1 Set
- Introdotto mobile.css per gestire lo schermo anche su cellulari (landscape)
- rimosso silenzio all'inizio dell'audio del pigugno giocato
## 2 Set
- Rinominati elementi TrickEntry, TrickEntry[] e TrickEntry[][] in TrickEntry, Trick, and CompletedTricks
- refactored ComputerPlayer externalizing methdos. Enabled strict compile mode, an converted ComputerPlayer, GameState, and some other minor JS in TS.
- Aggiunto interruttore audio
- Aggiunti Confetti con la libreria confetti.js (https://confettijs.org/) e audio nel GameOver
- Cambiato packager, passato da esbuild a vite, in modo da correggere problemi di cache. Ora tutti gli asset hanno un url con hashtag
## 3 Set
- Corretto il bug del posizionamento dei punti durante il conteggio, ora sono esattemante centrati nelle aree di gioco-
- Corretto bug: sul cellulare, la player area del giocatore é "elastica", cosí quando non ci sono piú carte da giocare (durante il conteggio dei punti) la player-bottom "collassa" e left e right aumentano di altezza. Fixed size su mobile?