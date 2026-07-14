import { Game } from "../../../../packages/engines/src";
import { Vector2 } from "../../../../packages/engines/src";
import { Platform, Player, AI } from "./entities/Plataform";
import { Ball } from "./entities/Ball";

export class PongGame extends Game {

    private ball: Ball;
    private platform1: Platform;
    private platform2: Platform;
    private player: Player;
    private ai: AI;

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)

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

    public update(dt: number): void {
        void dt;

        if(this.player.input.isKeyDown('enter')){
            this.switchPlayerMode(this.context)
        }

        this.ball.update(this.context, dt);
        this.platform1.update(this.context, dt, this.ball);
        this.platform2.update(this.context, dt, this.ball);
    }

    public render(): void {
        super.render()

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






