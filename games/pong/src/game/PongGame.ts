import { Game } from "../../../../packages/engines/src";
import { Vector2 } from "../../../../packages/engines/src";
import { Platform, Player, AI } from "./entities/Plataform";
import { Ball } from "./entities/Ball";
import { UI } from "./ui/ui";

export class PongGame extends Game {

    private ball: Ball;
    private platform1: Platform;
    private platform2: Platform;
    private player: Player;
    private ai: AI;
    private ui: UI;

    public score: GameScore
    
    public gameState = new PongGameState()

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)

        this.player = new Player()
        this.ai = new AI()
        this.ui = new UI(this, {p1: 0, p2: 0}, '', '')
        this.score = {p1 : 0, p2 : 0}

        this.gameState = PongGameState.NOT_STARTED

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
            position: new Vector2({x: 0, y: (canvas.height / 2) - 30}),
            velocity: new Vector2({x: 0, y: 0}),
            color: 'black',
            controller: this.player
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
            this.gameState = PongGameState.PLAYING
        }

        this.ball.update(this, dt);
        this.platform1.update(this, dt, this.ball);
        this.platform2.update(this, dt, this.ball);

        this.ui.update(dt);
    }

    public render(): void {
        super.render()

        this.ball.render(this);
        this.platform1.render(this);
        this.platform2.render(this);

        this.ui.render(this);
    }

}


export type GameScore = {
    p1: number;
    p2: number;
}

export class PongGameState {
    static NOT_STARTED: string = 'NOT_STARTED';
    static PLAYING: string = 'PLAYING'
    static PAUSED: string = 'PAUSED'
    static JUST_SCORED: string = 'JUST_SCORED';
    static END_GAME: string = 'END_GAME'
}


