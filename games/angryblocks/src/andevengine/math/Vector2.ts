export type Vector2Options = {
    x: number;
    y: number;
}

export class Vector2 {
    public x: number;
    public y: number;

    public constructor({x, y}: Vector2Options) {
        this.x = x;
        this.y = y;
    }

    public normalize(): Vector2 {
        const length = Math.sqrt(this.x * this.x + this.y * this.y);

        if (length === 0) {
            return new Vector2({ x: 0, y: 0 });
        }
        return new Vector2({
            x: this.x / length,
            y: this.y / length
        });
    }
}