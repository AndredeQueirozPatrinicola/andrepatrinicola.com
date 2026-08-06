import { Game } from '../../../../packages/engines/src/andevengine/game/Game';
 
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

    constructor(position: Vector2, shape: Shape) {
        this.shape = shape;
        this.position = position;
    }
}

export class Shape {}


export class AABB {}


export class AngryBlocks extends Game {

    

    public update(dt: number): void {
        
    }


    public render(){

    }

}