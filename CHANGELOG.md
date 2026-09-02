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
- refactored ComputerPlayer externalizing methdos, convert some classes to ts. Enabled strict compile mode