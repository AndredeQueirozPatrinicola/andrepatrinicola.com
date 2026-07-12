export class Game {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    private animationFrameId: number | null = null;
    private previousTime = 0;

    private ball: Ball;
    private platform1: Platform;
    private platform2: Platform;
    private player: Player;
    private ai: AI;

    public constructor(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('2d');

        if (!context) {
        throw new Error('Não foi possível obter o contexto 2D do Canvas.');
        }

        this.canvas = canvas;
        this.context = context;


        this.player = new Player()
        this.ai = new AI()

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
            height: 60,
            speed: 150,
            position: new Vector2({x: 0, y: (canvas.height / 2) - 50}),
            velocity: new Vector2({x: 0, y: 0}),
            color: 'black',
            controller: this.ai
        })

        this.platform2 = new Platform({
            width: 10, 
            height: 60,
            speed: 150,
            position: new Vector2({x: canvas.width -10, y: (canvas.height / 2) - 30}),
            velocity: new Vector2({x: 0, y: 0}),
            color: 'black',
            controller: this.ai
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

        if(this.player.input.isKeyDown('enter')){
            this.switchPlayerMode(this.context)
        }

        this.ball.update(this.context, dt);
        this.platform1.update(this.context, dt, this.ball);
        this.platform2.update(this.context, dt, this.ball);
    }

    private render(): void {
        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );

        this.ball.render(this.context);
        this.platform1.render(this.context);
        this.platform2.render(this.context);
    }

    private switchPlayerMode(ctx: CanvasRenderingContext2D) {
        this.platform1 = this.platform1.controller instanceof AI ? new Platform({
            width: 10, 
            height: 60,
            speed: 150,
            position: new Vector2({x: 0, y: (ctx.canvas.height / 2) - 50}),
            velocity: new Vector2({x: 0, y: 0}),
            color: 'black',
            controller: this.player
        }) : new Platform({
            width: 10, 
            height: 60,
            speed: 150,
            position: new Vector2({x: 0, y: (ctx.canvas.height / 2) - 50}),
            velocity: new Vector2({x: 0, y: 0}),
            color: 'black',
            controller: this.ai
        })
    }
}



export interface Object {
    width: number;
    height: number;
    speed?: number;
    position: Vector2;
    velocity: Vector2;
    color: string;
    radius?: number
}

export class Input {
    private readonly pressedKeys = new Set<string>();

    public constructor() {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    public isKeyDown(key: string): boolean {
        console.log(this.pressedKeys)
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

type BallOptions = {
  width: number
  height: number
  speed: number
  radius: number;
  position: Vector2
  velocity: Vector2
  color: string
}

export class Ball implements Object {
    public width: number;
    public height: number;
    public speed: number;
    public radius: number;
    public position: Vector2;
    public velocity: Vector2;
    public color: string;

    public constructor({width, height, speed, radius, position, velocity, color}: BallOptions) {
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.position = position;
        this.velocity = velocity;
        this.color = color;
        this.radius = radius;
    }

    public initialInercia(ctx: CanvasRenderingContext2D) {
        this.position.x = ctx.canvas.width / 2 
        this.position.y = ctx.canvas.height / 2 
            
        this.velocity.x = -3
        this.velocity.y = 0
    }

    public update(ctx: CanvasRenderingContext2D, dt: number) {

        if(this.position.x < ctx.canvas.width && this.position.x > 0) {
            this.position.x = this.position.x + this.velocity.x * this.speed * dt;
        }else {
            this.initialInercia(ctx);
            this.position.x = this.position.x + this.velocity.x * this.speed * dt;
        }
        if(this.position.y < ctx.canvas.height && this.position.y > 0) {
            this.position.y = this.position.y + this.velocity.y * this.speed * dt;
        } else {
            this.velocity.y = this.velocity.y * -1
            this.position.y = this.position.y + this.velocity.y * this.speed * dt;
        }
    }

    public render(ctx: CanvasRenderingContext2D) {        
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    public bounce(object: Object) {
        this.velocity.x = this.velocity.x * -1
        this.velocity.y = this.velocity.y + object.velocity?.y
    }
}

export class Player {
    public input: Input
    
    constructor(){
        this.input = new Input()
    }
};
export class AI {};

type PlatformOptions = {
  width: number
  height: number
  speed: number
  position: Vector2
  velocity: Vector2
  color: string
  controller: Player | AI
}

export class Platform implements Object {
    private input: Input

    public width: number;
    public height: number;
    public speed: number;
    public position: Vector2;
    public velocity: Vector2;
    public color: string;
    public controller: Player | AI

    public constructor({width, height, speed, position, velocity, color, controller}: PlatformOptions) {
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.position = position;
        this.velocity = velocity;
        this.color = color;
        this.controller = controller

        this.input = new Input();
    }

    public update(ctx: CanvasRenderingContext2D, dt: number, ball: Ball) {

        if(this.onAreaEntered(ball)){
            ball.bounce(this)
        }

        if (this.controller instanceof  Player ) {
            if (this.input.isKeyDown('w') && this.position.y > 0) {
                this.velocity.y = -1;
            } else if (this.input.isKeyDown('s') && this.position.y + this.height < ctx.canvas.height) {
                    this.velocity.y = 1;
            } else {
                this.velocity.y = 0
            }
        }  else if (this.controller instanceof AI) {
            const platformCenterY = this.position.y + this.height / 2
            const ballCenterY = ball.position.y + ball.radius / 2

            const direction = new Vector2({
                x: 0,
                y: ballCenterY - platformCenterY,
            }).normalize()
            this.velocity.y = direction.y
        }

        const nextY =
            this.position.y +
            this.velocity.y * this.speed * dt

        this.position.y = Math.max(
            0,
            Math.min(nextY, ctx.canvas.height - this.height)
        )
    }

    public onAreaEntered(object: Object) {
        return (
            (object.position.x) >= this.position.x && 
            (object.position.x) <= this.position.x + this.width &&
            (object.position.y) >= this.position.y &&
            (object.position.y) <= this.position.y + this.height
        )
    }

    public render(ctx: CanvasRenderingContext2D) {        
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}