import { useEffect, useState } from "react";

type TextTypeProps = {
  id: string;
  text: string[];
  typingSpeed?: number;
};

export function TextType({
  id,
  text = [],
  typingSpeed = 100,
}: TextTypeProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    const currentPhrase = text[currentPhraseIndex];

    if (!currentPhrase) {
      return;
    }

    if (currentCharIndex < currentPhrase.length) {
      const timeout = setTimeout(() => {
        setCurrentText((previousText) => {
          return previousText + currentPhrase[currentCharIndex];
        });

        setCurrentCharIndex((previousIndex) => previousIndex + 1);
      }, typingSpeed);

      return () => clearTimeout(timeout);
    }

    if (currentPhraseIndex < text.length - 1) {
      const timeout = setTimeout(() => {
        setCurrentText((previousText) => previousText + "\n");
        setCurrentPhraseIndex((previousIndex) => previousIndex + 1);
        setCurrentCharIndex(0);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [text, currentPhraseIndex, currentCharIndex, typingSpeed]);

  return (
    <>
      {currentText}
    </>
  );
}