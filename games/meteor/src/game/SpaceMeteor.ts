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
        this.meteorsInterval = 40;
        this.meteorsCounter = 0;

        this.spaceShip = new SpaceShip(
            this,
            canvas,
            new Vector2({ x: canvas.width / 2, y: canvas.height / 2 }),
            new Vector2({ x: 0, y: 0 }),
            new Vector2({ x: 75, y: 61 }),
            200
            );

        this.eventsObserver.subscribe({
            key: 'destroy_meteor',
            event: ({ meteor, missile }: any) => {
                const meteorIndex = this.meteors.indexOf(meteor);
                const missileIndex = this.spaceShip.storage.indexOf(missile);

                if (meteorIndex !== -1) {
                    this.meteors.splice(meteorIndex, 1);
                }

                if (missileIndex !== -1) {
                    this.spaceShip.storage.splice(missileIndex, 1);
                }
            }
        });
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
        
        for (const meteor of [...this.meteors]) {
            meteor.update(dt, this.spaceShip.storage);
        }

        for (const mssl of [...this.spaceShip.storage]){
            mssl.update(dt);
        }
    }

    public render(): void {
        this.context.imageSmoothingEnabled = false;
        super.render()
        this.spaceShip.render();

        for (const mtr of this.meteors){
            mtr.render();
        }

        for (const mmsl of this.spaceShip.storage) {
            mmsl.render();
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
    public storage: Missile [];

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
            const missile  = new Missile (
                this.ctx, this.canvas, 
                new Vector2({x: this.position.x + this.sprite.naturalWidth / 2 , y:this.position.y}), 
                new Vector2({x: 0, y: -1}), 
                new Vector2({x:3 ,y: 3}), 500, 5)
            this.storage.push(missile);
            this.isLoading = true;
        }

        if(this.isLoading){
            this.currentMisselTimeOut = this.currentMisselTimeOut + 1 * dt

            if (this.currentMisselTimeOut >= this.misselTimeOut){
                this.currentMisselTimeOut = 0;
                this.isLoading = false
            }
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
    }

    public shoot(){
        console.log("Atirei")
    }
}


export class Missile  {

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

    public ctx: SpaceMeteor;
    public position: Vector2;
    public velocity: Vector2;
    public dimension: Vector2;
    public speed: number;
    // public radius: number;
    public rotation: number;

    public canvas: HTMLCanvasElement;

    public constructor(
        ctx: SpaceMeteor,
        canvas: HTMLCanvasElement, 

    ) {
        this.ctx = ctx;
        this.canvas = canvas;

        const getRandom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        this.position = new Vector2({
            x: getRandom(0, this.ctx.canvas.width),
            y: -40
        });

        this.velocity = new Vector2({
            x: getRandom(-30, 30), 
            y: getRandom(40, 60)
        });

        this.dimension = new Vector2({
            x:getRandom(40, 80),
            y:getRandom(40, 80)
        });

        this.speed = getRandom(1, 2);
        this.rotation = 35
    }

    public update(dt: number, missiles: Missile[]) {
        this.position.x += this.velocity.x * this.speed * dt;
        this.position.y += this.velocity.y * this.speed * dt;

        for (const missile of missiles) {
            if (this.onAreaEntered(missile)) {
                this.ctx.eventsObserver.notify('destroy_meteor', {
                    meteor: this,
                    missile
                });

                break;
            }
        }
    }

    public render(): void {
        this.ctx.context.imageSmoothingEnabled = false;
        this.ctx.context.fillRect(this.position.x, this.position.y, this.dimension.x, this.dimension.y);
        this.ctx.context.fillStyle = 'black';
    }

    private onAreaEntered(missile: Missile): boolean {
        const closestX = Math.max(
            this.position.x,
            Math.min(missile.position.x, this.position.x + this.dimension.x)
        );

        const closestY = Math.max(
            this.position.y,
            Math.min(missile.position.y, this.position.y + this.dimension.y)
        );

        const distanceX = missile.position.x - closestX;
        const distanceY = missile.position.y - closestY;

        return (
            distanceX * distanceX + distanceY * distanceY
            <= missile.radius * missile.radius
        );
}

}


type Event = {
    key: string;
    event: (params?: any) => void;
}

class EventObserver {

    events: Event[]

    constructor(){
        this.events = [];
    }

    public subscribe(event: Event){
        this.events.push(event);
    }

    // public unsubscribe(event: Event){
    //     this.events.pop(event)
    // }

    public notify(key: string, params?: any) {
        for (const event of this.events){
            if(event.key == key){
                event.event(params);
            }
            // console.log(event)
        }
    }
}