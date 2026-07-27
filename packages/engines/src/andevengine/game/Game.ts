


export class Game {
    
    public readonly canvas: HTMLCanvasElement;
    public readonly context: CanvasRenderingContext2D;

    private animationFrameId: number | null = null;
    private previousTime = 0;

    constructor(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');

        if (!context) {
        throw new Error('Não foi possível obter o contexto 2D do Canvas.');
        }

        this.canvas = canvas;
        this.context = context;
    }

    public start(): void {
        if (this.animationFrameId !== null) {
        return;
        }

        this.load();

        this.previousTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    public stop(): void {
        if (this.animationFrameId === null) {
        return;
        }

        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
    }

    private readonly loop = (currentTime: number): void => {
        const deltaTime = (currentTime - this.previousTime) / 1000;

        this.previousTime = currentTime;

        this.update(deltaTime);
        this.render();

        this.animationFrameId = requestAnimationFrame(this.loop);
    };

    public load(): void {}

    public update(dt: number): void {
        void dt;
    }

    public render(): void {
        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );
    }
}