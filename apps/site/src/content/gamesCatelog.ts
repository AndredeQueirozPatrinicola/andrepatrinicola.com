import pongCover from '../assets/images/pong.png';


export type GameCatalog = {
    title: string, 
    slug: string,
    description: string,
    cover?: string | undefined,
    iframe: string,
    status:  'published' | 'unpublished',
    playUrl: string,
    devUrl: string
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
        cover: null,
        playUrl: '/play/meteor/index.html',
        status: 'published',
        devUrl: 'http://localhost:5175'
    },
]