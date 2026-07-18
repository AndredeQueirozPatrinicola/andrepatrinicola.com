import { Game } from "../../../../packages/engines/src";
import { Vector2 } from "../../../../packages/engines/src";
import { Input } from "../../../../packages/engines/src";

import spaceShip from '../images/spaceship.png'

export class SpaceMeteor extends Game {

    spaceShip: SpaceShip;

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)

        this.context.imageSmoothingEnabled = false;

        this.spaceShip = new SpaceShip(
            this,
            canvas,
            new Vector2({x: 0, y:0}),
            new Vector2({x: 0, y:0}),
            new Vector2({x: 10, y:10}),
            200
        )
    }

    public update(dt: number): void {
        void dt;

        this.spaceShip.update(dt);
    }

    public render(): void {
        this.context.imageSmoothingEnabled = false;
        super.render()
        this.spaceShip.render();
    }

}


export class SpaceShip {

    public ctx: Game;
    public position: Vector2;
    public velocity: Vector2;
    public dimension: Vector2;
    public speed: number;
    public canvas: HTMLCanvasElement;
    
    public misselTimeOut: number;
    public currentMisselTimeOut: number;
    public isLoading: boolean;

    public input: Input;
    public storage: Missil[];

    public sprite: HTMLImageElement;

    public constructor(
        ctx: Game,
        canvas: HTMLCanvasElement, 
        position: Vector2, 
        velocity: Vector2, 
        dimension: Vector2,
        speed: number
    ) {
        this.ctx = ctx;
        this.position = position;
        this.velocity = velocity;
        this.dimension = dimension;
        this.canvas = canvas;
        this.speed = speed;

        this.misselTimeOut = 1
        this.currentMisselTimeOut = 0
        this.isLoading = false

        this.input = new Input();
        this.storage = [];

        this.sprite = new Image();
        this.sprite.src = spaceShip
    }

    public update(dt: number): void {
        
        if(this.input.isKeyDown('a')){
            this.position.x += -1 * this.speed * dt;
        }
        if(this.input.isKeyDown('s')){
            this.position.y += 1 * this.speed * dt;
        }
        if(this.input.isKeyDown('d')){
            this.position.x += 1 * this.speed * dt;
        }
        if(this.input.isKeyDown('w')){
            this.position.y += -1 * this.speed * dt;
        } 

        if(this.input.isKeyDown('enter') && !this.isLoading){
            const missil = new Missil(
                this.ctx, this.canvas, 
                new Vector2({x: this.position.x, y:this.position.y}), 
                new Vector2({x: 0, y: -1}), 
                new Vector2({x:3 ,y: 3}), 500)
            this.storage.push(missil);
            this.isLoading = true;
        }

        if(this.isLoading){
            this.currentMisselTimeOut = this.currentMisselTimeOut + 1 * dt

            if (this.currentMisselTimeOut >= this.misselTimeOut){
                this.currentMisselTimeOut = 0;
                this.isLoading = false
            }
        }

        for(let x = 0; x < this.storage.length; x++){
            this.storage[x].update(dt);
        }
    }

    public render(): void {
        this.ctx.context.imageSmoothingEnabled = false;
        const x = Math.round(this.position.x);
        const y = Math.round(this.position.y);

        this.ctx.context.drawImage(
            this.sprite,
            x,
            y,
            this.dimension.x,
            this.dimension.y
        );

        for (const missile of this.storage) {
            missile.render();
        }
    }
}


export class Missil {

    public ctx: Game;
    public position: Vector2;
    public velocity: Vector2;
    public dimension: Vector2;
    public speed: number;

    public canvas: HTMLCanvasElement;

    public constructor(
        ctx: Game,
        canvas: HTMLCanvasElement, 
        position: Vector2, 
        velocity: Vector2, 
        dimension: Vector2,
        speed: number
    ) {
        this.ctx = ctx;
        this.position = position;
        this.velocity = velocity;
        this.dimension = dimension;
        this.speed = speed;
        this.canvas = canvas;
    }

    public update(dt: number): void {
        this.position.x += this.velocity.x * this.speed * dt;
        this.position.y += this.velocity.y * this.speed * dt;
    }

    public render(): void {
        this.ctx.context.imageSmoothingEnabled = false;
        this.ctx.context.fillRect(this.position.x, this.position.y, this.dimension.x, this.dimension.y);
        this.ctx.context.fillStyle = 'black';
        this.ctx.context.fill();
    }
}
