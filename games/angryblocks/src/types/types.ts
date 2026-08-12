import { Shape } from "../game/AngryBlocks"
import { Vector2 } from "../game/AngryBlocks"

export type CollidableObjectType = {
    shape: Shape
    position: Vector2
    velocity: Vector2
    mass: number,
    restitution: number
}

export type RenderableObjectType = {
    canvas: CanvasRenderingContext2D
}

export type Collision = {
    normal: Vector2
    penetration: number,
    contactPoint: Vector2
}