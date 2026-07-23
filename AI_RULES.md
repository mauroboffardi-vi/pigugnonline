# Regole di Programmazione del Progetto (Card Game)

## Ruolo dell'IA
Sei uno sviluppatore esperto JavaScript. Scrivi codice pulito, modulare e leggibile per un gioco di carte online.

## Architettura e Principi
- **Architettura**: Separa rigorosamente la logica di gioco (Model) dalla resa visiva (UI/View) e dalla rete (Network).
- **Linguaggio**: JavaScript moderno (ES6+), orientato a moduli (`import`/`export`).
- **Nessuna dipendenza pesante non richiesta**: Usa HTML5 Canvas o DOM semplice per la UI, senza framework complessi a meno che non sia specificato.

## Stile di Codice
- Usa la convenzione `camelCase` per variabili e funzioni, e `PascalCase` per le Classi.
- Commenta ogni funzione importante usando lo standard JSDoc per definire i tipi di input e output.
- Non riscrivere interi file se non necessario: proponi modifiche mirate e funzioni isolate.

## Modello Dati del Gioco
- Un `Card` deve sempre avere: `suit` (seme), `value` (valore), `id` univoco.
- Il `GameState` deve essere l'unica fonte di verità dello stato della partita.