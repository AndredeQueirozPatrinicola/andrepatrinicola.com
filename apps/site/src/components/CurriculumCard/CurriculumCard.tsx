import { ReactNode } from 'react';


export type CurriculumCard = {
    icon: string;
    title: string;
    children?: ReactNode;
}

export function CurriculumCard ({
    icon, 
    title, 
    children
}: CurriculumCard) {
    return (
        <div className="curriculum-card">
            <span className="curriculum-card-title">
                <img src={icon}></img>
                {title}
            </span>
            <div className='curriculum-card-container'>
                <div className='curriculum-card-content'>
                    {children}
                </div>
            </div>
        </div>
    )
}


export function CurriculumCardContent({
    children
}: {children: ReactNode}) {
    return (
        <div>
            {children}
        </div>
    )
}
