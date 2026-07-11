import { ReactNode, useState, useCallback } from "react";
import { NoContentPlaceHolder } from "../components/NoContentPlaceHolder/NoContentPlaceHolder";

type UseLoadContentReturn = {
  isLoading: boolean;
  load: (content: ReactNode) => void;
};

export function useLoadContent(
  setCurrentContent: (content: ReactNode) => void
): UseLoadContentReturn {
  const [isLoading, setIsLoading] = useState(false);

  const getRandomSpeed = (min: number, max: number) => {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
  };

  const load = useCallback((content: ReactNode) => {
    setIsLoading(true);

    setTimeout(() => {
      if (!content) {
        setCurrentContent(<NoContentPlaceHolder id="no-content" />);
      } else {
        setCurrentContent(content);
      }
      setIsLoading(false);
    }, getRandomSpeed(300, 700));
  }, [setCurrentContent]);

  return { isLoading, load };
}
