import { Input } from "../../andevengine/input/Input";
import { Vector2 } from "../../andevengine/math/Vector2";
import { CollisionObject } from "../common/common";
import { PongGame, PongGameState } from "../PongGame";

export class Player {
    public input: Input
    
    constructor(){
        this.input = new Input()
    }
};
export class AI {
    public reaction = 0.4;
    public anticipation = 0.8;
    public slowDownDistance = 24;
    public aimError = 0.9;
    public angleError = 0.35;

    private aimOffset = 0;
    private wasApproaching = false;

    public getDirection(platform: Platform, ball: CollisionObject, width: number, height: number): number {
        const platformCenterY = platform.position.y + platform.height / 2;
        const platformCenterX = platform.position.x + platform.width / 2;
        const approaching = Math.sign(platformCenterX - ball.position.x) === Math.sign(ball.velocity.x);

        if (approaching && !this.wasApproaching) {
            const error = this.aimError + Math.abs(ball.velocity.y) * this.angleError;
            this.aimOffset = (Math.random() - 0.5) * platform.height * error;
        }
        this.wasApproaching = approaching;

        let targetY = height / 2;
        const distance = Math.abs(platformCenterX - ball.position.x);

        if (approaching && distance < width * (1 - this.reaction)) {
            const predictedY = this.predictY(ball, platformCenterX, height);
            targetY = ball.position.y + (predictedY - ball.position.y) * this.anticipation + this.aimOffset;
        }

        const differenceY = targetY - platformCenterY;

        return Math.max(-1, Math.min(1, differenceY / this.slowDownDistance));
    }

    private predictY(ball: CollisionObject, x: number, height: number): number {
        const speed = ball.speed ?? 1;
        const time = (x - ball.position.x) / (ball.velocity.x * speed);
        const y = ball.position.y + ball.velocity.y * speed * time;
        const period = height * 2;
        const folded = ((y % period) + period) % period;

        return folded > height ? period - folded : folded;
    }
};


type PlatformOptions = {
  width: number
  height: number
  speed: number
  position: Vector2
  velocity: Vector2
  color: string
  controller: Player | AI
}

export class Platform implements CollisionObject {
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

    public update(ctx: PongGame, dt: number, collisionObject: CollisionObject) {

        if(this.onAreaEntered(collisionObject)){
            collisionObject.bounce(this)
        }

        if (ctx.gameState === PongGameState.PLAYING) {
            if (this.controller instanceof  Player ) {
                if (this.input.isKeyDown('w') && this.position.y > 0) {
                    this.velocity.y = -1;
                } else if (this.input.isKeyDown('s') && this.position.y + this.height < ctx.canvas.height) {
                        this.velocity.y = 1;
                } else {
                    this.velocity.y = 0
                }
            }  else if (this.controller instanceof AI) {
                this.velocity.y = this.controller.getDirection(this, collisionObject, ctx.canvas.width, ctx.canvas.height);
            }
        }   else {
                this.position.y = ctx.canvas.height / 2 - 30
        }

        const nextY =
            this.position.y +
            this.velocity.y * this.speed * dt

        this.position.y = Math.max(
            0,
            Math.min(nextY, ctx.canvas.height - this.height)
        )
    }

    public onAreaEntered(object: CollisionObject) {
        return (
            (object.position.x) >= this.position.x && 
            (object.position.x) <= this.position.x + this.width &&
            (object.position.y) >= this.position.y &&
            (object.position.y) <= this.position.y + this.height
        )
    }

    public render(ctx: PongGame) {        
        ctx.context.fillRect(this.position.x, this.position.y, this.width, this.height);
        ctx.context.fillStyle = this.color;
        ctx.context.fill();
    }

    public bounce(object: CollisionObject) {}
}
