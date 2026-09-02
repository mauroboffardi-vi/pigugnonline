// Informa TypeScript che esiste un modulo chiamato 'confetti-js'
declare module 'confetti-js' {
    // Definiamo un'interfaccia per descrivere la configurazione accettata
    export interface ConfettiSettings {
        target?: string | HTMLCanvasElement;
        max?: number;
        size?: number;
        animate?: boolean;
        props?: Array<string | { type: string; src: string; size?: number; weight?: number }>;
        colors?: Array<[number, number, number]>;
        clock?: number;
        rotate?: boolean;
        start_from_edge?: boolean;
        respawn?: boolean;
    }

    // Definiamo la classe principale esportata dal pacchetto
    export default class ConfettiGenerator {
        constructor(settings: ConfettiSettings);
        render(): void;
        clear(): void;
    }
}