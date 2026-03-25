import { ScrollViewStyleReset } from "expo-router/html";

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>Ohara — Explore hobbies, track your goals.</title>
        <meta
          name="description"
          content="A personal operating system for becoming. Set goals, reflect, and grow."
        />

        {/* Google Fonts — Instrument Serif */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />

        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: baseStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const baseStyles = `
html, body, #root {
  height: 100%;
  background-color: #FAF9F6;
}
* {
  box-sizing: border-box;
}
button, [role="button"] {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
button:hover, [role="button"]:hover {
  transform: scale(1.02);
  opacity: 0.92;
}
`;
