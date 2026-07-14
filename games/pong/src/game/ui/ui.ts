import { GameScore, PongGame, PongGameState } from "../PongGame";

const myFont = new FontFace('CustomFont', 'url(../../fonts/VCR_OSD_MONO_1.001.ttf)');

myFont.load().then((font) => {
    document.fonts.add(font);
}).catch(err => {
    console.error("Font failed to load:", err);
});

export class UI {

    public score: GameScore;
    public title: string;
    public text: string;
    public game: PongGame;

    constructor(game: PongGame, score: GameScore, title: string, text: string){
        this.score = score;
        this.game = game;
        this.title = title;
        this.text = text;
    }

    public update(dt: number) {
        if(this.game.gameState === PongGameState.NOT_STARTED){
            this.title = 'Classic PONG'
            this.text = 'Pressione Enter para iniciar'
        }

        if(
            this.game.gameState === PongGameState.PLAYING || 
            this.game.gameState === PongGameState.PAUSED || 
            this.game.gameState === PongGameState.JUST_SCORED
        ){
            this.score.p1 = this.game.score.p1
            this.score.p2 = this.game.score.p2
            
            this.text = 'Pressione Enter para continuar'
        }
    }

    public render(ctx: PongGame) {  
        if(this.game.gameState === PongGameState.NOT_STARTED){
            ctx.context.font = "34px CustomFont";
            ctx.context.fillStyle = "#2f2f2f";
            ctx.context.textBaseline = "middle";
            
            ctx.context.fillText(this.title, ctx.canvas.width / 2 - ctx.context.measureText(this.title).width / 2, 100);

            ctx.context.font = "20px CustomFont";
            ctx.context.fillStyle = "#2f2f2f";
            ctx.context.textBaseline = "middle";
            
            ctx.context.fillText(this.text, ctx.canvas.width / 2 - ctx.context.measureText(this.text).width / 2, 250);
        }

        if(
            this.game.gameState === PongGameState.PLAYING || 
            this.game.gameState === PongGameState.PAUSED || 
            this.game.gameState === PongGameState.JUST_SCORED
        ){
            ctx.context.font = "34px CustomFont";
            ctx.context.fillStyle = "#2f2f2f";
            ctx.context.textBaseline = "middle";
            
            ctx.context.fillText(String(this.score.p1), ctx.canvas.width / 2 - 40, 100);

            ctx.context.font = "34px CustomFont";
            ctx.context.fillStyle = "#2f2f2f";
            ctx.context.textBaseline = "middle";
            
            ctx.context.fillText(String(this.score.p2), ctx.canvas.width / 2 + 20, 100);
        }

        if(
            this.game.gameState === PongGameState.PAUSED ||
            this.game.gameState === PongGameState.JUST_SCORED
        ){
            ctx.context.font = "20px CustomFont";
            ctx.context.fillStyle = "#2f2f2f";
            ctx.context.textBaseline = "middle";
            
            ctx.context.fillText(this.text, ctx.canvas.width / 2 - ctx.context.measureText(this.text).width / 2, 250);
        }

        ctx.context.beginPath();
        ctx.context.strokeStyle = "#d8d8d8";
        ctx.context.moveTo(ctx.canvas.width / 2, 0);
        ctx.context.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
        ctx.context.stroke();
    }
}
