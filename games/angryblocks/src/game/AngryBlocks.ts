import { Game } from '../../../../packages/engines/src/andevengine/game/Game';
import { Input } from '../../../../packages/engines/src/andevengine/input/Input'
import { Cursor } from '../../../../packages/engines/src/index'
import { CollidableObjectType, RenderableObjectType } from '../types/types';


const GRAVITY_FORCE = 980


const lerp = (A: number, B: number, T: number) => {
    return A + (B - A) * T
}

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

    public hasEnteredArea(collidable: CollidableObject): boolean {
        return false
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
    public collision: CollidableObject;
    
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
            this.collision.velocity.y = this.collision.velocity.y + GRAVITY_FORCE * dt; 
            
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

    // Retirado de: https://www.jeffreythompson.org/collision-detection/circle-rect.php
    public hasEnteredArea(rect: CollidableObject) {
        let testX = this.collision.position.x;
        let testY = this.collision.position.y;

        // which edge is closest?
        if (this.collision.position.x < rect.position.x){
            testX = rect.position.x
        }      // test left edge
        else if (this.collision.position.x > rect.position.x+rect.shape.width){
             testX = rect.position.x+rect.shape.width;   // right edge
        }
        if (this.collision.position.y < rect.position.y) {
             testY = rect.position.y; 
        }     // top edge
        else if (this.collision.position.y > rect.position.y+rect.shape.height){
            testY = rect.position.y+rect.shape.height;   // bottom edge
        }

        // get distance from closest edges
        let distX = this.collision.position.x-testX;
        let distY = this.collision.position.y-testY;
        let distance = Math.sqrt( (distX*distX) + (distY*distY) );

        // if the distance is less than the radius, collision!
        if (distance <= ( this.collision.shape.radius || 0)) {
            return true;
        }
        return false;
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

// export class CollisionManager {
//     private collidables: CollidableObject[] = [];

//     constructor(collidables: CollidableObject[]){
//         this.collidables = collidables
//     }

//     public update(dt: number) {
        
//         for(let x = 0; x < this.collidables.length; x++){
//             for(let y = 0; y < this.collidables.length + 1; y++){
//                 if(this.collidables[x].hasEnteredArea(this.collidables[y])) {
//                     console.log("?????")
//                 }
//             }
//         }
//     }

//     public add(collidable: CollidableObject){
//         this.collidables.push(collidable)
//     }    
// }


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

                if (pull.length() > 500) {
                    const direction = pull.normalize()

                    pull.x = direction.x * 500
                    pull.y = direction.y * 500
                } 

                this.currBall.collision.velocity.x = pull.x * 7.5
                this.currBall.collision.velocity.y = pull.y * 7.5

                this.currBall.isBeingDragged = false
                this.ballManager.setBall(this.currBall);
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

export class Base extends CollidableEntity {

    constructor(rendererOpts: RenderableObjectType, collidableOpts: CollidableObjectType) {
        super(rendererOpts, collidableOpts);
    }

    public render(){
        this.renderer.canvas.imageSmoothingEnabled = false;
        this.renderer.canvas.fillStyle = "#2f2f2f";
        this.renderer.canvas.fillRect(
            this.collision.position.x, this.collision.position.y, 
            this.collision.shape.width, this.collision.shape.height
        );
    }
    
}

export class BallManager {

    public ball?: Ball;
    public collidables: CollidableObject[] = [];
    public camera: Camera;
    public canvas: HTMLCanvasElement

    constructor(canvas: HTMLCanvasElement, camera: Camera) {
        this.camera = camera
        this.canvas = canvas
    }

    public update(dt: number) {

            this.ball && this.ball.update(dt);
            for(const coll of this.collidables) {
                if(this.ball && this.ball.hasEnteredArea(coll)){
                    console.log("???")
                }
            }

            if(this.ball && this.ball?.collision.position.y > this.canvas.height) {
                this.ball = undefined
                this.camera.position = new Vector2(0,0)
                this.camera.target = new Vector2(0,0)
            }
        
    }

    public render() {
        this.ball && this.ball.render();
    }

    public setBall(ball: Ball) {
        this.ball = ball
    }
}
export class Camera {
    
    public position: Vector2;
    public target: Vector2;
    public canvas: CanvasRenderingContext2D

    constructor(canvas: CanvasRenderingContext2D, target: Vector2) {
        this.target = target
        this.position = this.target
        this.canvas = canvas
    }

    public update(dt: number) {
        // this.target.x = this.target.x - 10 * dt
        this.target.x = lerp(this.position.x, this.target.x, 0.5)
        this.position = this.target
    }

    public render(){
        this.canvas.translate(-this.target.x, -this.target.y)
    }

}

type AngryBlocksContext = {
    Cursor?: Cursor,
    BallManager?: BallManager,
    Slingshot?: Slingshot,
    Base?: Base,
    Camera?: Camera
}

export class AngryBlocks extends Game {

    private gameContext: AngryBlocksContext;

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)
        this.gameContext = {}
    }

    public load() {
        this.gameContext.Cursor = new Cursor(this.canvas);
        this.gameContext.Camera = new Camera(this.context, new Vector2(0, 0))
        this.gameContext.BallManager = new BallManager(this.canvas, this.gameContext.Camera);

        this.gameContext.Slingshot = new Slingshot(
            {canvas: this.context}, 
            new Shape(10, 175), 
            new Vector2((this.canvas.width / 2) - 50, this.canvas.height - 175),
            this.gameContext.Cursor,
            this.gameContext.BallManager
        )

        this.gameContext.Base = new Base(
                {
                    canvas: this.context
                },
                {
                    shape: new Shape(300, 150),
                    position: new Vector2(this.canvas.width * 2, this.canvas.height - 150),
                    velocity: new Vector2(0,0),
                    mass: 1e7
                }
        )

        this.gameContext.BallManager.collidables.push(this.gameContext.Base.collision)
    }

    public update(dt: number): void {
        this.gameContext.BallManager && this.gameContext.BallManager.update(dt);
        this.gameContext.Slingshot && this.gameContext.Slingshot.update(dt);
        this.gameContext.Camera && this.gameContext.Camera.update(dt);

        
        if(this.gameContext.Camera && this.gameContext.BallManager?.ball) {
            if(this.gameContext.BallManager.ball.collision.position.x > this.canvas.width / 2) {
                this.gameContext.Camera.target =  new Vector2(
                    this.gameContext.BallManager?.ball.collision.position.x - this.canvas.width / 2, 
                    0
                )
            }
        }
    }

    public render(){
        super.render();

        this.context.save();

        this.gameContext.Camera && this.gameContext.Camera.render();

        this.gameContext.BallManager && this.gameContext.BallManager.render();
        this.gameContext.Slingshot && this.gameContext.Slingshot.render();
        this.gameContext.Base && this.gameContext.Base.render();

        this.context.restore();
        
    }
}