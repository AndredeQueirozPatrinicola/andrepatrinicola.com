import type { MouseEvent, ReactNode } from "react";

type NavItemProps = {
  id: string;
   label: string, 
   content: ReactNode
   onClick?: (event: MouseEvent, arg0: ReactNode) => void | undefined
};

export function NavItem({ id, label, content, onClick }: NavItemProps) {
  return (
    <a 
        className="nav-item" 
        id={id} 
        onClick={
            onClick ? 
                (event) => onClick(event, content) : 
                undefined
            }
        >
        {label}
    </a>
  );
}
