import { Game } from '../../../../packages/engines/src/andevengine/game/Game';
import { CollidableObjectType, RenderableObjectType } from '../types/types';
 

export class Shape {
    public width: number;
    public height: number;
    public radius?: number;

    constructor(width: number, height: number, radius: number){
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


export class Slingshot {

}




export class AngryBlocks extends Game {

    private gameContext: any;

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)
        this.gameContext = {}
    }

    public load() {

        

    }

    public update(dt: number): void {
        
    }


    public render(){

    }

}