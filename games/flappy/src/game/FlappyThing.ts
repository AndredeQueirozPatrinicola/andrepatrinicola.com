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
    private collisionManager:CollisionManager

    constructor(options: FlappyThingOptions) {
        super(options.canvas);

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
            new Vector2({x:0,y:0})

        );

        this.pipeBeamManager = new PipeBeamManager(this.context, this.canvas);
        this.collisionManager = new CollisionManager(this.thing, this.pipeBeamManager.pipeBeams)
    }

    public update(dt:number) {
        this.thing.update(dt);

        this.pipeBeamManager.update(dt);
        this.collisionManager.update(dt);
    }

    public render(): void {
        super.render();

        this.thing.render();
        this.pipeBeamManager.render();
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
        this.renderer.fillStyle = "#000000";
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

    private SPACE: number;

    constructor(renderer: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
        this.renderer = renderer;
        this.canvas = canvas;

        this.SPACE = 200;

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
        const upperPipeHeight = getRandom(30, this.canvas.height / 2)

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
}

export class PipeBeamManager 
{
    private renderer: CanvasRenderingContext2D;
    private canvas: HTMLCanvasElement;
    public pipeBeams: PipeBeam[];
    private timer: Timer;
    private observer: EventObserver;

    constructor(renderer: CanvasRenderingContext2D, canvas: HTMLCanvasElement) { 
        this.renderer = renderer;
        this.canvas = canvas;
        
        this.pipeBeams = [];

        const timeOutEvent = {key: 'onTimeOut', event: this.onTimeOut};
        this.observer = new EventObserver();
        this.observer.subscribe(timeOutEvent)

        this.timer = new Timer(1, 0, this.observer, timeOutEvent);
        this.timer.start();
    }
    
    public update(dt: number)
    {
        this.timer.update(dt);

        for(const pipeBeam of this.pipeBeams){
            pipeBeam.update(dt);
        }
    }

    public render() {
        for(const pipeBeam of this.pipeBeams){
            pipeBeam.render();
        }
    }

    public onTimeOut = () => {
        this.pipeBeams.push(new PipeBeam(this.renderer, this.canvas));
    }
}

export class Thing extends CollidableObject
{
    private input: Input;

    constructor(renderer: CanvasRenderingContext2D, hitbox: Hitbox, position: Position, shape: Polygon, velocity: Vector2){
        super(renderer, hitbox, position, shape, velocity);

        this.input = new Input();
    }

    public update(dt: number){
        this.velocity.y = this.velocity.y + GRAVITY_FORCE * dt;

        if(this.input.isKeyDown(' ')){
            this.velocity.y = this.velocity.x - 300 * dt;
        }

        this.position.pos.y = this.position.pos.y + this.velocity.y;
    }
}

export class CollisionManager
{
    private thing: Thing;
    private beams: PipeBeam[];

    constructor(thing: Thing, beams: PipeBeam[]){
        this.thing = thing;
        this.beams = beams;
    }

    public update(dt: number){

        for (const beam of this.beams) {
            if(
                beam.upperPipe.onAreaEntered(this.thing.hitbox) ||
                beam.downPipe.onAreaEntered(this.thing.hitbox)
            ) {
                console.log("Dano")
            }
        }
    };
}
