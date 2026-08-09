import { Vector2 } from "../../../../../packages/engines/src";
import { CollisionObject } from "../common/common";
import { PongGame, PongGameState } from "../PongGame";

type BallOptions = {
  width: number
  height: number
  speed: number
  radius: number;
  position: Vector2
  velocity: Vector2
  color: string
}

export class Ball implements CollisionObject {
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

    public onOffX(ctx: PongGame) {

        if (this.position.x < 0) {
            ctx.score.p2 = ctx.score.p2 + 1;
            this.velocity.x = -3
        } else {
            ctx.score.p1 = ctx.score.p1 + 1;
            this.velocity.x = 3
        }

        this.velocity.y = 0

        this.position.x = ctx.context.canvas.width / 2 
        this.position.y = ctx.context.canvas.height / 2 


        if (ctx.score.p1 === 5 || ctx.score.p2 === 5) {
            ctx.gameState = PongGameState.NOT_STARTED
            ctx.score = {p1: 0, p2: 0}
        } else {
            ctx.gameState = PongGameState.PAUSED
        }
    }

    public update(ctx: PongGame, dt: number) {

        if (
            ctx.gameState === PongGameState.PLAYING ||
            ctx.gameState === PongGameState.NOT_STARTED ||
            ctx.gameState === PongGameState.END_GAME
        ){

            if(this.onAreaEntered(ctx.platform1)){
                this.bounce(ctx.platform1)
            }

            if(this.onAreaEntered(ctx.platform2)){
                this.bounce(ctx.platform2)
            }

            if(this.position.x < ctx.context.canvas.width && this.position.x > 0) {
                this.position.x = this.position.x + this.velocity.x * this.speed * dt;
            }else {
                this.onOffX(ctx);
                this.position.x = this.position.x + this.velocity.x * this.speed * dt;
            }
            if(this.position.y < ctx.context.canvas.height && this.position.y > 0) {
                this.position.y = this.position.y + this.velocity.y * this.speed * dt;
            } else {
                this.velocity.y = this.velocity.y * -1
                this.position.y = this.position.y + this.velocity.y * this.speed * dt;
            }
        }
    }

    public render(ctx: PongGame) {        
        ctx.context.beginPath();
        ctx.context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, true);
        ctx.context.closePath();
        ctx.context.fillStyle = this.color;
        ctx.context.fill();
    }

    public onAreaEntered(object: CollisionObject) {
        let testX = this.position.x;
        let testY = this.position.y;

        // which edge is closest?
        if (this.position.x < object.position.x){
            testX = object.position.x
        }      // test left edge
        else if (this.position.x > object.position.x+object.width){
             testX = object.position.x+object.width;   // right edge
        }
        if (this.position.y < object.position.y) {
             testY = object.position.y; 
        }     // top edge
        else if (this.position.y > object.position.y+object.height){
            testY = object.position.y+ object.height;   // bottom edge
        }

        // get distance from closest edges
        let distX = this.position.x-testX;
        let distY = this.position.y-testY;
        let distance = Math.sqrt( (distX*distX) + (distY*distY) );

        // if the distance is less than the radius,!
        if (distance <= ( this.radius || 0)) {
            return true;
        }
        return false;
    }

    public bounce(object: CollisionObject) {
        this.velocity.x = this.velocity.x * -1
        this.velocity.y = this.velocity.y + object.velocity?.y
    }
}