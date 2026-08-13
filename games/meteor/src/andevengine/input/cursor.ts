export class Cursor {
    private x: number = 0;
    private y: number = 0;
    private canvas: HTMLCanvasElement;

    private boundMouseMove: (e: MouseEvent) => void;

    public constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.boundMouseMove = this.onMouseMove.bind(this);

        this.canvas.addEventListener('mousemove', this.boundMouseMove);
    }

    private onMouseMove(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();

        this.x = e.clientX - rect.left;
        this.y = e.clientY - rect.top;
    }

    public getPosition() {
        return { x: this.x, y: this.y };
    }

    public destroy(): void {
        this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    }
}