
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
        slug: 'tennis',
        title: 'Classic Tennis',
        description: 'Um dos primeiros jogos da historia',
        cover: undefined,
        playUrl: '/play/tennis/index.html',
        status: 'published',
        devUrl: 'http://localhost:5174'
    },
]