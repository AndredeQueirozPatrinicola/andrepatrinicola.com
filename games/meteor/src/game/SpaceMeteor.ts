import { Game } from "../../../../packages/engines/src";
import { Vector2 } from "../../../../packages/engines/src";
import { Input } from "../../../../packages/engines/src";

import spaceShip from '../images/spaceship.png'

export class SpaceMeteor extends Game {

    spaceShip: SpaceShip;
    meteors: Meteor[];
    meteorsInterval: number;
    meteorsCounter: number;
    eventsObserver: EventObserver;

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)

        this.eventsObserver = new EventObserver()
        this.meteors = []
        this.meteorsInterval = 80;
        this.meteorsCounter = 0;

        this.spaceShip = new SpaceShip(
            this,
            canvas,
            new Vector2({ x: canvas.width / 2, y: canvas.height / 2 }),
            new Vector2({ x: 0, y: 0 }),
            new Vector2({ x: 75, y: 61 }),
            200
            );
    }

    public update(dt: number): void {
        void dt;

        this.spaceShip.update(dt);


        if (this.meteorsCounter >= this.meteorsInterval){
            this.meteors.push(
                new Meteor(this, this.canvas)
            )
            this.meteorsCounter = 0;
        } else {
            this.meteorsCounter += 1;
        }

        for (const mtr of this.meteors){
            mtr.update(dt);
        }
    }

    public render(): void {
        this.context.imageSmoothingEnabled = false;
        super.render()
        this.spaceShip.render();

        for (const mtr of this.meteors){
            mtr.render();
        }
    }

}


export class SpaceShip {

    public ctx: SpaceMeteor;
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
        ctx: SpaceMeteor,
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


        this.ctx.eventsObserver.subscribe({key: 'shoot', event: this.shoot})
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
            this.ctx.eventsObserver.notify('shoot')
            const missil = new Missil(
                this.ctx, this.canvas, 
                new Vector2({x: this.position.x + this.sprite.naturalWidth / 2 , y:this.position.y}), 
                new Vector2({x: 0, y: -1}), 
                new Vector2({x:3 ,y: 3}), 500, 5)
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

    public shoot(){
        console.log("Atirei")
    }
}


export class Missil {

    public ctx: Game;
    public position: Vector2;
    public velocity: Vector2;
    public dimension: Vector2;
    public speed: number;
    public radius: number;

    public canvas: HTMLCanvasElement;

    public constructor(
        ctx: Game,
        canvas: HTMLCanvasElement, 
        position: Vector2, 
        velocity: Vector2, 
        dimension: Vector2,
        speed: number,
        radius: number
    ) {
        this.ctx = ctx;
        this.position = position;
        this.velocity = velocity;
        this.dimension = dimension;
        this.speed = speed;
        this.canvas = canvas;
        this.radius = radius;
    }

    public update(dt: number): void {
        this.position.x += this.velocity.x * this.speed * dt;
        this.position.y += this.velocity.y * this.speed * dt;
    }

    public render(): void {
        this.ctx.context.imageSmoothingEnabled = false;
        this.ctx.context.beginPath();
        this.ctx.context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, true);
        this.ctx.context.closePath();
        this.ctx.context.fillStyle = 'black';
        this.ctx.context.fill();
    }
}



export class Meteor {

    public ctx: Game;
    public position: Vector2;
    public velocity: Vector2;
    public dimension: Vector2;
    public speed: number;
    // public radius: number;
    public rotation: number;

    public canvas: HTMLCanvasElement;

    public constructor(
        ctx: Game,
        canvas: HTMLCanvasElement, 

    ) {
        this.ctx = ctx;
        this.canvas = canvas;

        const getRandom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        this.position = new Vector2({
            x: getRandom(0, this.ctx.canvas.width / 2),
            y: -150
        });

        this.velocity = new Vector2({
            x: getRandom(-10, 10), 
            y: getRandom(30, 50)
        });

        this.dimension = new Vector2({
            x:getRandom(40, 80),
            y:getRandom(40, 80)
        });

        this.speed = getRandom(1, 2);
        this.rotation = 35
    }

    public update(dt: number){
        this.position.x += this.velocity.x * this.speed * dt;
        this.position.y += this.velocity.y * this.speed * dt;


        // this.rotation += 10 * dt;
    }

    public render(): void {
        this.ctx.context.save();

        this.ctx.context.translate(
            this.position.x + this.dimension.x/2,
            this.position.y + this.dimension.y/2
        );
        // this.ctx.context.rotate(this.rotation * Math.PI / 180);
        this.ctx.context.imageSmoothingEnabled = false;
        this.ctx.context.fillRect(this.position.x, this.position.y, this.dimension.x, this.dimension.y);
        this.ctx.context.fillStyle = 'black';

        this.ctx.context.restore();
    }
}


type Event = {
    key: string;
    event: () => void;
}

class EventObserver {

    events: Event[]

    constructor(){
        this.events = [];
    }

    public subscribe(event: Event){
        console.log(event)
        this.events.push(event);
    }

    // public unsubscribe(event: Event){
    //     this.events.pop(event)
    // }

    public notify(key: string) {
        for (const event of this.events){
            if(event.key == key){
                event.event();
            }
            // console.log(event)
        }
    }
}