import { Shape } from "../game/AngryBlocks"
import { Vector2 } from "../game/AngryBlocks"

export type CollidableObjectType = {
    shape: Shape
    position: Vector2
    velocity: Vector2
    mass: number
}

export type RenderableObjectType = {
    canvas: CanvasRenderingContext2D
}