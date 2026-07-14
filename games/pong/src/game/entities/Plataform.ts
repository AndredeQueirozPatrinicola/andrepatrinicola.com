import { Vector2 } from "../../../../../packages/engines/src";
import { Input } from "../../../../../packages/engines/src";
import { CollisionObject } from "../common/common";
import { PongGame, PongGameState } from "../PongGame";

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
                const platformCenterY = this.position.y + this.height / 2;
                const targetY = collisionObject.position.y;

                const differenceY = targetY - platformCenterY;
                const tolerance = 3;

                if (Math.abs(differenceY) <= tolerance) {
                    this.velocity.y = 0;
                } else {
                    this.velocity.y = Math.sign(differenceY);
                }           
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