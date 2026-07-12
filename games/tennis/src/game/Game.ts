export class Game {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private animationFrameId: number | null = null;
    private previousTime = 0;

    private ball: Ball;
    private platform1: Platform;

    public constructor(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');

        if (!context) {
        throw new Error('Não foi possível obter o contexto 2D do Canvas.');
        }

        this.canvas = canvas;
        this.context = context;

        this.ball = new Ball({
            width: 10, 
            height: 10,
            speed: 100,
            radius: 5,
            position: new Vector2({x: canvas.width / 2, y: canvas.height / 2}),
            velocity: new Vector2({x: -3, y: 0}),
            color: 'black'
        })

        this.platform1 = new Platform({
            width: 10, 
            height: 50,
            speed: 100,
            position: new Vector2({x: 0, y: canvas.height / 2}),
            velocity: new Vector2({x: 0, y: 0}),
            color: 'black'
        })
    }

    public start(): void {
        if (this.animationFrameId !== null) {
        return;
        }

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

    private update(dt: number): void {
        void dt;

        this.ball.update(this.context, dt);
    }

    private render(): void {
        this.context.clearRect(
        100,
        100,
        this.canvas.width,
        this.canvas.height,
        );

        this.ball.render(this.context);
        this.platform1.render(this.context);
    }
}


export class Vector2 {
    public x: number;
    public y: number;

    public constructor({x, y}: Vector2) {
        this.x = x;
        this.y = y;
    }
}

type BallOptions = {
  width: number
  height: number
  speed: number
  radius: number;
  position: Vector2
  velocity: Vector2
  color: string
}

export class Ball {
    public width: number;
    public height: number;
    public speed: number;
    public radius: number;
    public position: Vector2;
    public velocity: Vector2;
    public color: string; // TODO: Criar type RGB

    public constructor({width, height, speed, radius, position, velocity, color}: BallOptions) {
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.position = position;
        this.velocity = velocity;
        this.color = color;
        this.radius = radius;
    }

    public update(ctx: CanvasRenderingContext2D, dt: number) {

        if(this.position.x < ctx.canvas.width && this.position.x > 0) {
            this.position.x = this.position.x + this.velocity.x * this.speed * dt;
        }
        if(this.position.y < ctx.canvas.clientHeight && this.position.y > 0) {
            this.position.y = this.position.y + this.velocity.y * this.speed * dt;
        }
    }

    public draw() {
        window.requestAnimationFrame(this.draw);
    }

    public render(ctx: CanvasRenderingContext2D) {        
        ctx.clearRect(this.position.x, this.position.y, ctx.canvas.width, ctx.canvas.height);
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

type PlatformOptions = {
  width: number
  height: number
  speed: number
  position: Vector2
  velocity: Vector2
  color: string
}

export class Platform {

    public width: number;
    public height: number;
    public speed: number;
    public position: Vector2;
    public velocity: Vector2;
    public color: string;

    public constructor({width, height, speed, position, velocity, color}: PlatformOptions) {
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.position = position;
        this.velocity = velocity;
        this.color = color;
    }

    public update(ctx: CanvasRenderingContext2D, dt: number) {
        
    }

    public draw() {
        window.requestAnimationFrame(this.draw);
    }

    public render(ctx: CanvasRenderingContext2D) {        
        ctx.clearRect(this.position.x, this.position.y, ctx.canvas.width, ctx.canvas.height);
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}