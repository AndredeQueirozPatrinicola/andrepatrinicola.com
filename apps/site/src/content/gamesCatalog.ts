import pongCover from '../assets/images/pong.png';
import meteorsCover from '../assets/images/meteors.png'
import flappy from '../assets/images/flappy.png'
import letritas from '../assets/images/letreco.png'

export type GameCatalog = {
    title: string, 
    slug: string,
    description: string,
    cover?: string | undefined,
    iframe: string,
    status:  'published' | 'unpublished',
    playUrl: string,
    devUrl: string,
    target?: string
}

export const gamesCatalog = [
    {
        slug: 'pong',
        title: 'Classic Pong',
        description: 'Um dos primeiros jogos da historia',
        cover: pongCover,
        playUrl: '/play/pong/index.html',
        status: 'published',
        devUrl: 'http://localhost:5174'
    },
    {
        slug: 'meteor',
        title: 'SpaceShip Meteor',
        description: 'Navegue uma espaço nave',
        cover: meteorsCover,
        playUrl: '/play/meteor/index.html',
        status: 'published',
        devUrl: 'http://localhost:5175'
    },
    {
        slug: 'flappy',
        title: 'Flappy Thing',
        description: 'Não é exatamente um passaro...',
        cover: flappy,
        playUrl: '/play/flappy/index.html',
        status: 'published',
        devUrl: 'http://localhost:5176'
    },
    {
        slug: 'letritas',
        title: 'Letritas',
        description: 'Jogo de adivinhação divertido',
        cover: letritas,
        playUrl: 'https://andredequeirozpatrinicola.github.io/letreco/',
        status: 'published',
        devUrl: 'https://andredequeirozpatrinicola.github.io/letreco/',
        target: '_blank'
    }
]