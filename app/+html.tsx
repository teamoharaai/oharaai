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
        <title>OharaAI — Premium demo presentation</title>
        <meta
          name="description"
          content="OharaAI is a premium, minimal workspace for focused progress and professional execution."
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
  background-color: #0A0A0F;
  color: #FAFAFA;
}
* {
  box-sizing: border-box;
}
button, [role="button"] {
  transition: transform 0.15s ease, opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}
button:hover, [role="button"]:hover {
  transform: scale(1.02);
  opacity: 0.96;
}
`;
