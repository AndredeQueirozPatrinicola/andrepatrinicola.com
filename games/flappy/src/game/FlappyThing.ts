import { Game } from '../../../../packages/engines/src/andevengine/game/Game'
import { Vector2 } from '../../../../packages/engines/src/andevengine/math/Vector2'
import { Input } from  '../../../../packages/engines/src/andevengine/input/Input'


const GRAVITY_FORCE = 25
const getRandom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export type FlappyThingOptions = {
    canvas: HTMLCanvasElement
} 

export class FlappyThing extends Game 
{
    private thing: Thing;
    private pipeBeamManager: PipeBeamManager;
    private messagesUi: MessagesUI

    public gameState: number;
    private input: Input;

    constructor(options: FlappyThingOptions) {
        super(options.canvas);

        this.gameState = GameStates.PAUSED
        this.input = new Input()

        const initialPosition = new Position(new Vector2({
            x: 200,
            y: this.canvas.height / 2
        }))
        const polygon = new Polygon(30, 30);

        this.thing = new Thing(
            this.context,
            new Hitbox(polygon, initialPosition),
            initialPosition,
            polygon,
            new Vector2({x:0,y:0}),
            this.canvas,
            this
        );

        this.pipeBeamManager = new PipeBeamManager(this.context, this.canvas, this.thing, this);

        this.messagesUi = new MessagesUI(this.context, this)
    }

    public update(dt:number) {
        this.thing.update(dt);
        this.pipeBeamManager.update(dt);        

        if(this.gameState === GameStates.PAUSED) {
            if(this.input.isKeyDown(' ') || this.input.isKeyDown('click')){
                this.gameState = GameStates.PLAYING
            }
        }
    }

    public render(): void {
        super.render();

        this.thing.render();
        this.pipeBeamManager.render();

        this.messagesUi.render()
    }
}

export class Timer 
{
    public timeOut: number;
    public isTicking: boolean;
    public counter: number;
    public accumulator: number;
    public observer?: EventObserver;
    public timeOutCallback?: Event;

    constructor(timeOut: number, counter: number, observer?: EventObserver, callback?: Event){
        this.timeOut = timeOut;
        this.counter = counter;
        this.observer = observer;
        this.timeOutCallback = callback;

        this.isTicking = false;
        this.accumulator = 0;
    }

    public start(){
        this.isTicking = true;
    }

    public stop() {
        this.isTicking = false;
    }

    public update(dt: number) {
        if(this.isTicking){
            this.accumulator = this.accumulator + 1 * dt;

            if (this.accumulator >= this.timeOut){
                this.accumulator = 0;
                this.counter++;

                if(this.observer && this.timeOutCallback) {
                    this.observer.notify(this.timeOutCallback.key)
                }
            }
        }
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
export class Hitbox
{
    public shape: Polygon;
    public position: Position;

    constructor(shape: Polygon, position: Position){
        this.shape = shape;
        this.position = position;
    }
}

export class Position 
{
    public pos: Vector2;

    constructor(pos: Vector2) { this.pos = pos }
}

export class Polygon 
{
    public width: number;
    public height: number;

    constructor(width: number, height: number){
        this.width = width;
        this.height = height;
    }
}

export class CollidableObject 
{
    public renderer: CanvasRenderingContext2D
    public hitbox: Hitbox;
    public position: Position;
    public shape: Polygon;
    public velocity: Vector2;

    constructor (renderer: CanvasRenderingContext2D, hitbox: Hitbox, position: Position, shape: Polygon, velocity: Vector2){
        this.renderer = renderer;
        this.hitbox = hitbox;
        this.position = position;
        this.shape = shape;
        this.velocity = velocity
    }

    public onAreaEntered(hitbox: Hitbox): boolean {
        return (
            this.hitbox.position.pos.x + this.hitbox.shape.width >= hitbox.position.pos.x &&
            this.hitbox.position.pos.x <= hitbox.position.pos.x + hitbox.shape.width &&
            this.hitbox.position.pos.y + this.hitbox.shape.height >= hitbox.position.pos.y &&
            this.hitbox.position.pos.y <= hitbox.position.pos.y + hitbox.shape.height
        )
    }

    public render(): void {
        this.renderer.imageSmoothingEnabled = false;
        this.renderer.fillStyle = "#2f2f2f";
        this.renderer.fillRect(this.position.pos.x, this.position.pos.y, this.shape.width, this.shape.height);
        this.renderer.fillStyle = 'black';
    }
}

export class Pipe extends CollidableObject 
{
    constructor(renderer: CanvasRenderingContext2D, hitbox: Hitbox, position: Position, shape: Polygon, velocity: Vector2){
        super(renderer, hitbox, position, shape, velocity)
    }

    public update(dt: number){
        this.velocity.x = 1;

        this.position.pos.x = this.position.pos.x + this.velocity.x - 300 * dt;
    }
}

export class PipeBeam 
{
    public renderer: CanvasRenderingContext2D
    public canvas: HTMLCanvasElement

    public upperPipe: Pipe;
    public downPipe: Pipe;

    private SPACE: number = 125;

    private alreadyPassed: boolean = false;

    constructor(renderer: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        this.renderer = renderer;
        this.canvas = canvas;

        [this.upperPipe, this.downPipe] = this.mount()  
    }

    public update(dt: number){
        this.upperPipe.update(dt);
        this.downPipe.update(dt);
    }

    public render(){
        this.upperPipe.render();
        this.downPipe.render();
    }

    private mount() {
        const upperPipeHeight = getRandom(30, this.canvas.height / 2 + 50)

        const upperPipePolygon = new Polygon(30, upperPipeHeight)
        const upperPosition = new Position(new Vector2({x: this.canvas.width, y: 0 }))

        const downPipePolygon = new Polygon(30, this.canvas.height - upperPipeHeight + this.SPACE)
        const downPosition = new Position(new Vector2({x: this.canvas.width, y: upperPipeHeight + this.SPACE}))

        const zeroVector2 = new Vector2({x: 0, y: 0})

        const upperPipe = new Pipe(
            this.renderer,
            new Hitbox(upperPipePolygon, upperPosition),
            upperPosition,
            upperPipePolygon,
            zeroVector2
        )
        const downPipe =  new Pipe(
            this.renderer,
            new Hitbox(downPipePolygon, downPosition),
            downPosition,
            downPipePolygon,
            zeroVector2
        )

        return [upperPipe, downPipe]
    }

    public passedThrough(thing: Thing):boolean{
        if(
            thing.position.pos.x > this.upperPipe.position.pos.x &&
            !this.alreadyPassed
        ) {
            this.alreadyPassed = true;
            return true;
        }
        return false
    }
}

export class PipeBeamManager 
{
    private renderer: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;

    private timer: Timer;
    private observer: EventObserver;

    private thing;
    private pipeBeams: PipeBeam[];
    
    private gamePoints: GamePointsUI;
    private game: FlappyThing;

    constructor(renderer: CanvasRenderingContext2D, canvas: HTMLCanvasElement, thing: Thing, game: FlappyThing) { 
        this.renderer = renderer;
        this.canvas = canvas;
        this.game = game;
        
        this.pipeBeams = [];

        const timeOutEvent = {key: 'onTimeOut', event: this.onTimeOut};
        this.observer = new EventObserver();
        this.observer.subscribe(timeOutEvent)

        this.timer = new Timer(1, 0, this.observer, timeOutEvent);
        this.timer.start();

        this.pipeBeams.push(new PipeBeam(this.renderer, this.canvas));

        this.thing = thing;

        this.gamePoints = new GamePointsUI(renderer, 0);
    }
    
    public update(dt: number)
    {
        if(this.game.gameState === GameStates.PLAYING){
            this.timer.update(dt);

            for(const pipeBeam of this.pipeBeams){
                pipeBeam.update(dt);
                if(
                    pipeBeam.upperPipe.onAreaEntered(this.thing.hitbox) ||
                    pipeBeam.downPipe.onAreaEntered(this.thing.hitbox) || 
                    this.thing.isOutOfScreen()
                ) {
                    this.reset();
                    this.thing.reset();
                    this.game.gameState = GameStates.PAUSED
                }

                if(pipeBeam.passedThrough(this.thing)) {
                    this.gamePoints.gamePoints++;
                }
            }
        }
    }

    public render() {
        for(const pipeBeam of this.pipeBeams){
            pipeBeam.render();
        }

        this.gamePoints.render();
    }

    public onTimeOut = () => {
        this.pipeBeams.push(new PipeBeam(this.renderer, this.canvas));
    }

    public reset() {
        this.pipeBeams.splice(0, this.pipeBeams.length);
        this.gamePoints.gamePoints = 0;
    }
}

export class Thing extends CollidableObject
{
    private input: Input;
    private canvas: HTMLCanvasElement

    private JUMP_FORCE = 3;

    private game: FlappyThing;

    constructor(
        renderer: CanvasRenderingContext2D, 
        hitbox: Hitbox, position: Position, shape: Polygon, velocity: Vector2, canvas: HTMLCanvasElement,
        game: FlappyThing
    ){
        super(renderer, hitbox, position, shape, velocity);

        this.input = new Input();
        this.canvas = canvas;
        this.game = game;
    }

    public update(dt: number){
        if(this.game.gameState === GameStates.PLAYING){
            this.velocity.y = this.velocity.y + GRAVITY_FORCE * dt;

            if(this.input.isKeyDown(' ') || this.input.isKeyDown('click')){
                this.velocity.y = -this.JUMP_FORCE;
            }

            this.position.pos.y = this.position.pos.y + this.velocity.y;
        }
    }

    public isOutOfScreen(){
        return (
            this.position.pos.x + this.shape.width >= this.canvas.width || 
            this.position.pos.x <= 0 || 
            this.position.pos.y <= 0 || 
            this.position.pos.y + this.shape.height >= this.canvas.height
        )
    }

    public reset(){
        this.position.pos.x = 200
        this.position.pos.y = 270
        this.velocity.x = 0
        this.velocity.y = 0
        this.hitbox.position.pos.x = this.position.pos.x
        this.hitbox.position.pos.y = this.position.pos.y
    }
}


export class GamePointsUI 
{
    private renderer: CanvasRenderingContext2D;
    public gamePoints: number;

    constructor(renderer: CanvasRenderingContext2D, gamePoints: number){
        this.renderer = renderer;
        this.gamePoints = gamePoints;
    }
    
    public render()
    {
        this.renderer.font = "20px CustomFont";
        this.renderer.fillStyle = "#2f2f2f";
        this.renderer.textBaseline = "middle";
        
        this.renderer.fillText(
            `${this.gamePoints}`, 
            this.renderer.canvas.width / 2 - 
                this.renderer.measureText(
                    `${this.gamePoints}`
                )
                .width / 2 , 
            50
        );
    }
}

export class MessagesUI 
{
    private renderer: CanvasRenderingContext2D;
    private game: FlappyThing;

    constructor(renderer: CanvasRenderingContext2D, game: FlappyThing){
        this.renderer = renderer;
        this.game = game;
    }

    public render(){
        if(this.game.gameState === GameStates.PAUSED){
            this.renderer.fillText(
                `Aperte espaço para começar`, 
                this.renderer.canvas.width / 2 - 
                    this.renderer.measureText(
                        `Aperte espaço para começar`
                    )
                    .width / 2 , 
                200
            );
        }
    }

}


export type GameState = {
    PAUSED: number;
    PLAYING: number;
}

export const GameStates = Object.freeze({
    PAUSED: 1,
    PLAYING: 2,
}) as GameState


