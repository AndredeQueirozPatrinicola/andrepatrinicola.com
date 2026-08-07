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
    
    constructor(rendererOpts: RenderableObjectType, collidableOpts: CollidableObjectType) {
        super(rendererOpts, collidableOpts);

        if (!collidableOpts.shape.radius) {
            throw Error("Balls must have a radius")
        }


    }

    public update(dt: number) {

        
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

    constructor(rendererOpts: RenderableObjectType, shape: Shape, position: Vector2, cursor: Cursor) {
        super(rendererOpts);

        this.shape = shape;
        this.position = position;
        this.cursor = cursor;
    }

    public update(dt: number) {
        
        if(this.input.isKeyDown('click')){
            const {x, y} = this.cursor.getPosition();

            console.log(x, y);
        }
    }
    
    public render(): void {
        this.canvas.imageSmoothingEnabled = false;
        this.canvas.fillStyle = "#2f2f2f";
        this.canvas.fillRect(
            this.position.x, this.position.y, 
            this.shape.width, this.shape.height
        );
        this.canvas.fillStyle = 'black';
    }

}


// export class SlingShotSling {


//     constructor() {

//     }


// }



export class AngryBlocks extends Game {

    private gameContext: any;

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)
        this.gameContext = {}
    }

    public load() {
        this.gameContext.Cursor = new Cursor(this.canvas);

        this.gameContext.Slingshot = new Slingshot(
            {canvas: this.context}, 
            new Shape(10, 175), 
            new Vector2(175, this.canvas.height - 175),
            this.gameContext.Cursor
        )

    }

    public update(dt: number): void {
        this.gameContext.Slingshot.update(dt);
    }


    public render(){
        this.gameContext.Slingshot.render();
    }

}