export class Input {
    private readonly pressedKeys = new Set<string>();

    public constructor() {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    public isKeyDown(key: string): boolean {
        return this.pressedKeys.has(key.toLowerCase());
    }

    public destroy(): void {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        this.pressedKeys.add(event.key.toLowerCase());
    };

    private readonly onKeyUp = (event: KeyboardEvent): void => {
        this.pressedKeys.delete(event.key.toLowerCase());
    };
}