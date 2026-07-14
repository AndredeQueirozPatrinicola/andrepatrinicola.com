import { Vector2 } from "../../../../../packages/engines/src";
import { CollisionObject } from "../common/common";

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

    public bounce(object: CollisionObject) {
        this.velocity.x = this.velocity.x * -1
        this.velocity.y = this.velocity.y + object.velocity?.y
    }
}