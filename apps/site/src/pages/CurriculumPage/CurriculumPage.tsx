
import { CurriculumCard, CurriculumCardContent } from '../../components/CurriculumCard/CurriculumCard'
import { List } from '../../components/List/List'

import './curriculum-page.css'
import icon from '../../assets/images/icons/icon-book.png'

export type CurriculumPageProps = {}

export function CurriculumPage({}: CurriculumPageProps) {
    return (
        <section className='curriculum-page'>
            <CurriculumCard 
                icon={icon}
                title='Experiências Profissionais'
            >
                <div className='curriculum-curriculum'>
                    <List 
                        title=''
                        list={[
                            'Pixit (2024 - 2026)',
                            'Technext (2023 - 2024)',
                            'STI - FFLCH (2022 - 2023)',
                            'APM - IBGE (2021 - 2022)',
                        ]}
                    />
                </div>
            </CurriculumCard>
            <CurriculumCard
                icon={icon}
                title='Skills'
            >
                <CurriculumCardContent>                       
                    <List 
                        title='Linguagens:'
                        list={[
                            'Typescript',
                            'Python',
                            'PHP',
                            'Lua',
                        ]}
                    />
                    <List 
                        title='Devops:'
                        list={[
                            'AWS',
                            'Docker',
                            'NGINX'
                        ]}
                    />
                    <List 
                        title='Tools:'
                        list={[
                            'MySQL',
                            'PostgreSQL',
                            'MongoDB'
                        ]}
                    />
                </CurriculumCardContent>
            </CurriculumCard>
            <CurriculumCard
                icon={icon}
                title='Idiomas'
            >
                <CurriculumCardContent>
                        <List 
                            title=''
                            list={[
                                'Português: Nativo',
                                'Inglês: Fluente',
                                'Espanhol: Intermediário'
                            ]}
                        />
                </CurriculumCardContent>
            </CurriculumCard>
        </section>
    )
}

