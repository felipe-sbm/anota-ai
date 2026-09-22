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
};

function toChars(text: string): string[] {
  return Array.from(text).map((char) => (char === " " ? "\u00A0" : char));
}

export function Transition({
  first,
  second,
  step = 25,
  duration = 300,
}: transitionProps) {
  const firstChars = toChars(first);
  const secondChars = toChars(second);

  const letterStyle = (index: number): CSSProperties => ({
    transitionDelay: `${index * step}ms`,
    transitionDuration: `${duration}ms`,
  });

  return (
    <span>
      <span className="sr-only">
        {first}
        {second ? ` (@${second})` : ""}
      </span>

      <span
        aria-hidden="true"
        className="group relative block overflow-hidden whitespace-nowrap"
      >
        <span className="block whitespace-nowrap">
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