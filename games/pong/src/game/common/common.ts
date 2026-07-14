import { Vector2 } from "../../../../../packages/engines/src";


export interface CollisionObject {
    width: number;
    height: number;
    speed?: number;
    position: Vector2;
    velocity: Vector2;
    color: string;
    radius?: number;
    bounce: (object: CollisionObject) => void;
}

