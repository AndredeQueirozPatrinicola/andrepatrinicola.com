import { Game } from "../../../../packages/engines/src";
import { Vector2 } from "../../../../packages/engines/src";
import { Input } from "../../../../packages/engines/src";

import spaceShip from '../images/spaceship.png'
import heart from '../images/heart.png'


export class SpaceMeteorGameState {
    static NOT_STARTED: string = 'NOT_STARTED';
    static PLAYING: string = 'PLAYING'
    static END_GAME: string = 'END_GAME'
}

export class SpaceMeteor extends Game {

    spaceShip: SpaceShip;
    meteors: Meteor[];
    UI: UI;

    globalInput: Input

    meteorsInterval: number;
    meteorsCounter: number;
    eventsObserver: EventObserver;

    gameState: SpaceMeteorGameState;


    gamePoints: number
    gamePointInterval: number;

    public constructor(canvas: HTMLCanvasElement) {
        super(canvas)

        this.eventsObserver = new EventObserver()
        this.meteors = []
        this.meteorsInterval = 10;
        this.meteorsCounter = 0;

        this.gameState = SpaceMeteorGameState.NOT_STARTED
        this.globalInput = new Input()

        this.gamePoints = 0;
        this.gamePointInterval = 0;

        this.spaceShip = new SpaceShip(
            this,
            canvas,
            new Vector2({ x: canvas.width / 2, y: canvas.height / 2 }),
            new Vector2({ x: 0, y: 0 }),
            new Vector2({ x: 75, y: 61 }),
            175,
            5
        );

        this.UI = new UI(this, this.spaceShip);

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

        this.eventsObserver.subscribe({
            key: 'hit_spaceship',
            event: ({_, spaceShip}: any) => {
                spaceShip.hit(1);
            }
        })
    }

    public update(dt: number): void {
        void dt;


        if (this.gameState === SpaceMeteorGameState.PLAYING) {
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
                meteor.update(dt, this.spaceShip);

                if(meteor.isOutOfScreenY()){
                    this.meteors.splice(this.meteors.indexOf(meteor), 1);
                }
            }

            for (const mssl of [...this.spaceShip.storage]){
                mssl.update(dt);
            }


            this.gamePointInterval = this.gamePointInterval + 1 * dt

            if (this.gamePointInterval >= 1){
                this.gamePointInterval = 0;
                this.gamePoints++;
            }
            
        } else {
            if(this.globalInput.isKeyDown(' ')){
                this.gamePoints = 0;
                this.meteors = [];
                this.spaceShip.life = 5;
                this.gameState = SpaceMeteorGameState.PLAYING;
            }
        }

        this.UI.update(dt);
    }

    public render(): void {
        this.context.imageSmoothingEnabled = false;
        super.render()
        this.spaceShip.render();

        if (this.gameState === SpaceMeteorGameState.PLAYING) {
            for (const mtr of this.meteors){
                mtr.render();
            }

            for (const mmsl of this.spaceShip.storage) {
                mmsl.render();
            }
        }

        this.UI.render();
    }

}


export class SpaceShip {

    public ctx: SpaceMeteor;
    public position: Vector2;
    public velocity: Vector2;
    public dimension: Vector2;
    public speed: number;
    public canvas: HTMLCanvasElement;
    public radius: number;
    
    public misselTimeOut: number;
    public currentMisselTimeOut: number;
    public isLoading: boolean;

    public input: Input;
    public storage: Missile [];

    public sprite: HTMLImageElement;

    public life: number;

    public recovering: boolean;
    public recoveringTimeout: number;
    public currentRecoveringFrame: number;

    public hitbox: HitBox;

    public constructor(
        ctx: SpaceMeteor,
        canvas: HTMLCanvasElement, 
        position: Vector2, 
        velocity: Vector2, 
        dimension: Vector2,
        speed: number,
        life: number
    ) {
        this.ctx = ctx;
        this.velocity = velocity;
        this.dimension = dimension;
        this.canvas = canvas;
        this.speed = speed;
        this.radius = this.dimension.x / 3;
        this.position = new Vector2({x: position.x - this.dimension.x/2, y:position.y});

        this.misselTimeOut = 1.25
        this.currentMisselTimeOut = 0
        this.isLoading = false

        this.input = new Input();
        this.storage = [];

        this.sprite = new Image();
        this.sprite.src = spaceShip

        this.life = life;
        this.recovering = false;
        this.recoveringTimeout = 1;
        this.currentRecoveringFrame = 0;

        this.hitbox = new HitBox(ctx, new Vector2({
            x: this.position.x + this.sprite.width / 2,
            y: this.position.y + this.sprite.height / 2
        }), this.radius)

        this.ctx.eventsObserver.subscribe({key: 'shoot', event: this.shoot})
    }

    public update(dt: number): void {
        
        if(
            this.input.isKeyDown('a') && 
            this.hitbox.position.x - this.hitbox.radius > 0
        ){
            this.position.x += -1 * this.speed * dt;
        }
        if(
            this.input.isKeyDown('s') && 
            this.hitbox.position.y + 
            this.hitbox.radius < this.canvas.height
        ){
            this.position.y += 1 * this.speed * dt;
        }
        if(this.input.isKeyDown('d') && 
            this.hitbox.position.x + 
            this.hitbox.radius < this.canvas.width
        ){
            this.position.x += 1 * this.speed * dt;
        }
        if(
            this.input.isKeyDown('w') && 
            this.hitbox.position.y - this.hitbox.radius > 0
        ){
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

        if(this.recovering){
            this.currentRecoveringFrame = this.currentRecoveringFrame + 1 * dt

            if (this.currentRecoveringFrame >= this.recoveringTimeout){
                this.currentRecoveringFrame = 0;
                this.recovering = false
            }
        }

        this.hitbox.position.x = this.position.x + this.sprite.width / 2;
        this.hitbox.position.y = this.position.y + this.sprite.height / 2
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


        // this.hitbox.render();
    }

    public shoot(){
        console.log("Atirei")
    }

    public hit(damage: number){
        
        if (this.life > 0 && !this.recovering){
            this.life = this.life - damage;

            if(this.life <= 0){
                this.destroy()
                return;
	    }

            this.recovering = true;
        }
    }

    public destroy(){
        this.ctx.gameState = SpaceMeteorGameState.END_GAME
        this.storage = []
        this.position = new Vector2({x: this.ctx.canvas.width / 2 - this.dimension.x/2, y:this.canvas.height / 2});
    }
}


export class Missile  {

    public ctx: SpaceMeteor;
    public position: Vector2;
    public velocity: Vector2;
    public dimension: Vector2;
    public speed: number;
    public radius: number;

    public canvas: HTMLCanvasElement;

    public hitbox: HitBox;

    public constructor(
        ctx: SpaceMeteor,
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

        this.hitbox = new HitBox(ctx, new Vector2({
            x: this.position.x,
            y: this.position.y
        }), this.radius)
    }

    public update(dt: number): void {
        this.position.x += this.velocity.x * this.speed * dt;
        this.position.y += this.velocity.y * this.speed * dt;

        this.hitbox.position.x = this.position.x;
        this.hitbox.position.y = this.position.y;
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

        this.position = new Vector2({
            x: this.getRandom(0, this.ctx.canvas.width),
            y: -40
        });

        this.velocity = new Vector2({
            x: this.getRandom(-10, 10), 
            y: this.getRandom(40, 60)
        });

        this.dimension = new Vector2({
            x:this.getRandom(40, 80),
            y:this.getRandom(40, 80)
        });

        this.speed = this.getSpeed();
        this.rotation = 35
    }

    public update(dt: number, spaceShip: SpaceShip) {
        this.position.x += this.velocity.x * this.speed * dt;
        this.position.y += this.velocity.y * this.speed * dt;

        if (this.onAreaEntered(spaceShip.hitbox)) {
                this.ctx.eventsObserver.notify('hit_spaceship', {
                    meteor: this,
                    spaceShip
                });
        }

        for (const missile of spaceShip.storage) {
            if (this.onAreaEntered(missile.hitbox)) {
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

    private onAreaEntered(hitbox: HitBox): boolean {
        const closestX = Math.max(
            this.position.x,
            Math.min(hitbox.position.x, this.position.x + this.dimension.x)
        );

        const closestY = Math.max(
            this.position.y,
            Math.min(hitbox.position.y, this.position.y + this.dimension.y)
        );

        const distanceX = hitbox.position.x - closestX;
        const distanceY = hitbox.position.y - closestY;

        return (
            distanceX * distanceX + distanceY * distanceY
            <= hitbox.radius * hitbox.radius
        );
    }


    private getSpeed(): number{
        if (this.ctx.gamePoints === 1) {
            return this.getRandom(2, 3)
        }
        return this.getRandom(20, 30) * (Math.log(this.ctx.gamePoints) * 0.1);
    }

    private getRandom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;


    public isOutOfScreenY(){
        return this.position.y - this.dimension.y > this.ctx.canvas.height;
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


class LifeHeart {

    ctx: SpaceMeteor;
    sprite: HTMLImageElement;
    position: Vector2;

    constructor(ctx: SpaceMeteor, path: string, position: Vector2){
        this.ctx = ctx;
        this.position = position;
        this.sprite = new Image();
        this.sprite.src = path;
    }

    public render(){
        this.ctx.context.imageSmoothingEnabled = false;
        const x = Math.round(this.position.x);
        const y = Math.round(this.position.y);

        this.ctx.context.drawImage(
            this.sprite,
            x,
            y,
           32,
           24
        );
    }
}


class UI {

    ctx: SpaceMeteor;
    spaceShip: SpaceShip;

    hearts: LifeHeart[];

    constructor(ctx: SpaceMeteor, spaceShip: SpaceShip) {
        this.ctx = ctx;
        this.spaceShip = spaceShip;

        this.hearts = []
    }

    public update(dt: number){

        if (this.ctx.gameState === SpaceMeteorGameState.PLAYING){
            this.hearts = (() => {
                return Array.from({length: this.spaceShip.life}).map((_, index) => {
                    return new LifeHeart(this.ctx, heart, 
                        new Vector2({
                            x: index * 26,
                            y: this.ctx.canvas.height - 30
                    }))
                })
            })()
        }
    }

    public render() {

        if(this.ctx.gameState === SpaceMeteorGameState.NOT_STARTED) {
            this.ctx.context.font = "20px CustomFont";
            this.ctx.context.fillStyle = "black";
            this.ctx.context.textBaseline = "middle";
            
            this.ctx.context.fillText(
                "Pressione 'Espaço' para jogar", 
                this.ctx.canvas.width / 2 - 
                    this.ctx.context.measureText(
                        "Pressione 'Espaço' para jogar"
                    )
                    .width / 2, 
                150
            );
        } else if (this.ctx.gameState === SpaceMeteorGameState.PLAYING) {
            this.ctx.context.font = "24px CustomFont";
            this.ctx.context.fillStyle = "black";
            this.ctx.context.textBaseline = "middle";

            for(let x = 0; x < this.hearts.length; x++) {
                this.hearts[x].render();
            }

            this.ctx.context.fillText(
                `${this.ctx.gamePoints}`, 
                this.ctx.canvas.width / 2 - 
                    this.ctx.context.measureText(
                        `${this.ctx.gamePoints}!`
                    )
                    .width / 2, 
                50
            );
        } else if (this.ctx.gameState === SpaceMeteorGameState.END_GAME) {
            this.ctx.context.font = "24px CustomFont";
            this.ctx.context.fillStyle = "black";
            this.ctx.context.textBaseline = "middle";

            this.ctx.context.fillText(
                `Voce sobreviveu por ${this.ctx.gamePoints} segundos!`, 
                this.ctx.canvas.width / 2 - 
                    this.ctx.context.measureText(
                        `Voce sobreviveu por ${this.ctx.gamePoints} segundos!`
                    )
                    .width / 2, 
                50
            );

            this.ctx.context.fillText(
                "Pressione 'Espaço' para jogar", 
                this.ctx.canvas.width / 2 - 
                    this.ctx.context.measureText(
                        "Pressione 'Espaço' para jogar"
                    )
                    .width / 2, 
                150
            );

        }
    }

}



class HitBox {

    ctx: SpaceMeteor
    position: Vector2;
    radius: number;

    constructor(ctx: SpaceMeteor, position: Vector2, radius: number){
        this.ctx = ctx;
        this.position = position;
        this.radius = radius;
    }

    public render() {
        this.ctx.context.imageSmoothingEnabled = false;
        this.ctx.context.beginPath();
        this.ctx.context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, true);
        this.ctx.context.closePath();
        this.ctx.context.fillStyle = 'rgba(128, 255, 145, 0.7)';
        this.ctx.context.fill();
    }
}