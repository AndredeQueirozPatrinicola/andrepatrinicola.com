import { Game } from '../../../../packages/engines/src/andevengine/game/Game';
import { Input } from '../../../../packages/engines/src/andevengine/input/Input'
import { Cursor } from '../../../../packages/engines/src/index'
import { CollidableObjectType, RenderableObjectType } from '../types/types';

export class Shape {
    public width: number;
    public height: number;
    public radius?: number;

    constructor(width: number, height: number, radius?: number){
        this.width = width;
        this.height = height;
        this.radius = radius;
    }
}

export class AABB {}

export class Vector2 {
    public x: number;
    public y: number;

    constructor(x: number, y: number){
        this.x = x;
        this.y = y;
    }

    public normalize(): Vector2 {
        const length = this.length()

        if (length === 0) {
            return new Vector2(0, 0);
        }
        return new Vector2(
            this.x / length,
            this.y / length
        );
    }

    public dot(vector: Vector2) {
        return (this.x * vector.x ) + (this.y * vector.y);
    }

    public length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

export class CollidableObject {
    public shape: Shape;
    public position: Vector2;
    public velocity: Vector2;
    public mass: number;

    constructor(opts: CollidableObjectType) {
        this.shape = opts.shape;
        this.position = opts.position;
        this.velocity = opts.velocity;
        this.mass = opts.mass;
    }
}

export class RenderableObject {
    public canvas: CanvasRenderingContext2D

    constructor(opts: RenderableObjectType){
        this.canvas = opts.canvas;
    }
}

export class CollidableEntity {
    public renderer: RenderableObject;
    public collision: CollidableObjectType;
    
    constructor(rendererOpts: RenderableObjectType, collidableOpts: CollidableObjectType) {
        this.renderer = new RenderableObject(rendererOpts);
        this.collision = new CollidableObject(collidableOpts);
    }
}

export class Ball extends CollidableEntity {

    public isBeingDragged: boolean = true;
    
    constructor(rendererOpts: RenderableObjectType, collidableOpts: CollidableObjectType) {
        super(rendererOpts, collidableOpts);

        if (!collidableOpts.shape.radius) {
            throw Error("Balls must have a radius")
        }
    }

    public update(dt: number) {

        if(!this.isBeingDragged) {
            this.collision.velocity.y = this.collision.velocity.y + 9.8; 
            
            this.collision.position.y = this.collision.position.y + this.collision.velocity.y * dt;
            this.collision.position.x = this.collision.position.x + this.collision.velocity.x * dt;
        }
    }

    public render() {
        this.renderer.canvas.imageSmoothingEnabled = false;
        this.renderer.canvas.beginPath();
        this.renderer.canvas.arc(this.collision.position.x, this.collision.position.y, this.collision.shape?.radius || 0, 0, Math.PI * 2, true);
        this.renderer.canvas.closePath();
        this.renderer.canvas.fillStyle = 'black';
        this.renderer.canvas.fill();
    }
}

export class Wall extends CollidableEntity {
    
    constructor(rendererOpts: RenderableObjectType, collidableOpts: CollidableObjectType) {
        super(rendererOpts, collidableOpts);
    }

    public render(): void {
        this.renderer.canvas.imageSmoothingEnabled = false;
        this.renderer.canvas.fillStyle = "#2f2f2f";
        this.renderer.canvas.fillRect(
            this.collision.position.x, this.collision.position.y, 
            this.collision.shape.width, this.collision.shape.height
        );
        this.renderer.canvas.fillStyle = 'black';
    }
}

export class CollisionManager {

}


export class Slingshot extends RenderableObject {
    public shape: Shape;
    public position: Vector2;

    private input: Input = new Input();
    private cursor: Cursor;
    private ballManager: BallManager;

    private slingShotSling: SlingShotSling;
    private currBall: Ball | null = null;

    constructor(rendererOpts: RenderableObjectType, shape: Shape, position: Vector2, cursor: Cursor, ballManager: BallManager) {
        super(rendererOpts);

        this.shape = shape;
        this.position = position;
        this.cursor = cursor;

        this.slingShotSling = new SlingShotSling(this, this.cursor, this.input);
        this.ballManager = ballManager;
    }

    public update(dt: number) {
        const {x, y} = this.cursor.getPosition()
        this.slingShotSling.update(dt);     
        
        if (this.slingShotSling.isDragging) {

            this.currBall = this.getBall()

            this.currBall.collision.position.x = x
            this.currBall.collision.position.y = y
        } else {
            if (this.currBall) {
                const pull = new Vector2(
                    this.position.x - x,
                    this.position.y - y
                )

                if (pull.length() > 1000) {
                    const direction = pull.normalize()

                    pull.x = direction.x * 1000
                    pull.y = direction.y * 1000
                } 

                this.currBall.collision.velocity.x = pull.x * 7.5
                this.currBall.collision.velocity.y = pull.y * 7.5

                this.currBall.isBeingDragged = false
                this.ballManager.add(this.currBall);
                this.currBall = null;
            }
        }

        this.currBall && this.currBall.update(dt);
    }
    
    public render(): void {
        this.canvas.imageSmoothingEnabled = false;
        this.canvas.fillStyle = "#2f2f2f";
        this.canvas.fillRect(
            this.position.x, this.position.y, 
            this.shape.width, this.shape.height
        );

        this.slingShotSling.render();

        this.currBall && this.currBall.render();
    }

    private getBall(): Ball {
        if(!this.currBall){
            const {x, y} = this.cursor.getPosition()
            return  new Ball(
                {
                    canvas:this.canvas
                }, 
                {
                    shape: new Shape(10, 10, 10),
                    position: new Vector2(x, y),
                    velocity: new Vector2(0, 0),
                    mass: 100
                },
            )
        }
        return this.currBall;
    }
}


export class SlingShotSling {
    public slingShot: Slingshot;
    public position?: Vector2;
    public input: Input;
    public cursor: Cursor;
 
    public isDragging: boolean;

    constructor(slingShot: Slingshot, cursor: Cursor, input: Input) {
        this.slingShot = slingShot;
        this.cursor = cursor;
        this.input = input;

        this.isDragging = false;
    }

    public update(dt: number){
        if(this.input.isKeyDown('click')){
            const {x, y} = this.cursor.getPosition();

            if(!this.position){
                this.position = new Vector2(x, y);
            }

            this.position.x = x;
            this.position.y = y;

            this.isDragging = true;
        } else {
            this.position = undefined;
            this.isDragging = false;
        }
    }
    
    public render(){

        if(this.position){
            this.slingShot.canvas.beginPath();
            this.slingShot.canvas.moveTo(this.slingShot.position.x, this.slingShot.position.y);
            this.slingShot.canvas.lineTo(this.position.x, this.position.y);
            this.slingShot.canvas.stroke();
            this.slingShot.canvas.closePath();
        }
    }
}


export class BallManager {

    public balls: Ball[] = []

    public update(dt: number) {
        for(const ball of this.balls) {
            ball.update(dt);
        }
    }

    public render() {
        for(const ball of this.balls) {
            ball.render();
        }
    }

    public add(ball: Ball) {
        this.balls.push(ball);
    }

    public remove(ball: Ball){
        this.balls.splice(this.balls.indexOf(ball), 1);
    }
}

export class AngryBlocks extends Game {

    private gameContext: any;

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)
        this.gameContext = {}
    }

    public load() {
        this.gameContext.Cursor = new Cursor(this.canvas);
        this.gameContext.BallManager = new BallManager();

        this.gameContext.Slingshot = new Slingshot(
            {canvas: this.context}, 
            new Shape(10, 175), 
            new Vector2(175, this.canvas.height - 175),
            this.gameContext.Cursor,
            this.gameContext.BallManager
        )
    }

    public update(dt: number): void {
        this.gameContext.BallManager.update(dt);
        this.gameContext.Slingshot.update(dt);
    }


    public render(){
        super.render();

        this.gameContext.BallManager.render();
        this.gameContext.Slingshot.render();
    }

}