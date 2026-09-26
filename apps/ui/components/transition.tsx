/**
 * anima a troca entre dois textos com efeito roleta, letra por letra
 * 
 * me inspirei no site do Lee Robinson (leerob.io)
 */

import type { CSSProperties } from "react";

type transitionProps = {
  first: string;
  second: string;
  step?: number;
  duration?: number;
  /** quando false, não aplica o próprio group, usa um ancestor com a classe group (útil para células inteiras) */
  ownGroup?: boolean;
};

function toChars(text: string): string[] {
  return Array.from(text).map((char) => (char === " " ? "\u00A0" : char));
}

export function Transition({
  first,
  second,
  step = 25,
  duration = 300,
  ownGroup = true,
}: transitionProps) {
  const firstChars = toChars(first);
  const secondChars = toChars(second);

  const letterStyle = (index: number): CSSProperties => ({
    transitionDelay: `${index * step}ms`,
    transitionDuration: `${duration}ms`,
  });

  /** esta modificação da v0.0.17  utiliza `overflow-hidden` para cortar qualquer porção que ultrapasse os limites!
  *
  * O texto que estiver sendo usado ao passar o mouse é colocado de forma "absoluta" e, portanto,
  * não afeta a largura. Se fosse mais longo que o texto original, o último caractere ficaria invisível.
  * Esta espécie de "âncora invisível" garante exibir todo o texto longo. */

  const stageWidthText = toChars(second.length > first.length ? second : first).join("");

  return (
    <span className="text-left">
      <span className="sr-only">
        {first}
        {second ? ` (@${second})` : ""}
      </span>

      <span
        aria-hidden="true"
        className={`${ownGroup ? "group " : ""}relative block overflow-hidden whitespace-nowrap`}
      >
        <span aria-hidden="true" className="invisible whitespace-nowrap pr-1.5">
          {stageWidthText}
        </span>

        <span className="absolute inset-x-0 top-0 whitespace-nowrap">
          {firstChars.map((char, index) => (
            <span
              key={`first-${index}`}
              className="inline-block will-change-transform transition-transform ease-in-out group-hover:-translate-y-full"
              style={letterStyle(index)}
            >
              {char}
            </span>
          ))}
        </span>

        <span className="absolute inset-x-0 top-0 whitespace-nowrap">
          {secondChars.map((char, index) => (
            <span
              key={`second-${index}`}
              className="inline-block translate-y-full will-change-transform transition-transform ease-in-out group-hover:translate-y-0"
              style={letterStyle(index)}
            >
              {char}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}