/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams:
        | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams }
        | { pathname: `/`; params?: Router.UnknownInputParams; }
        | { pathname: `/modal`; params?: Router.UnknownInputParams; }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(auth)'}/signup` | `/signup`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(tabs)'}/dashboard` | `/dashboard`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(tabs)'}/goals` | `/goals`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(tabs)'}/starlog` | `/starlog`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(tabs)'}/explore` | `/explore`; params?: Router.UnknownInputParams; }
        | { pathname: `/+not-found`, params: Router.UnknownInputParams & {} };
      hrefOutputParams:
        | { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams }
        | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams }
        | { pathname: `/`; params?: Router.UnknownOutputParams; }
        | { pathname: `/modal`; params?: Router.UnknownOutputParams; }
        | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownOutputParams; }
        | { pathname: `${'/(auth)'}/signup` | `/signup`; params?: Router.UnknownOutputParams; }
        | { pathname: `${'/(tabs)'}/dashboard` | `/dashboard`; params?: Router.UnknownOutputParams; }
        | { pathname: `${'/(tabs)'}/goals` | `/goals`; params?: Router.UnknownOutputParams; }
        | { pathname: `${'/(tabs)'}/starlog` | `/starlog`; params?: Router.UnknownOutputParams; }
        | { pathname: `${'/(tabs)'}/explore` | `/explore`; params?: Router.UnknownOutputParams; }
        | { pathname: `/+not-found`, params: Router.UnknownOutputParams & {} };
      href:
        | Router.RelativePathString
        | Router.ExternalPathString
        | `/${`?${string}` | `#${string}` | ''}`
        | `/modal${`?${string}` | `#${string}` | ''}`
        | `/_sitemap${`?${string}` | `#${string}` | ''}`
        | `${'/(auth)'}/login${`?${string}` | `#${string}` | ''}`
        | `/login${`?${string}` | `#${string}` | ''}`
        | `${'/(auth)'}/signup${`?${string}` | `#${string}` | ''}`
        | `/signup${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}/dashboard${`?${string}` | `#${string}` | ''}`
        | `/dashboard${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}/goals${`?${string}` | `#${string}` | ''}`
        | `/goals${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}/starlog${`?${string}` | `#${string}` | ''}`
        | `/starlog${`?${string}` | `#${string}` | ''}`
        | `${'/(tabs)'}/explore${`?${string}` | `#${string}` | ''}`
        | `/explore${`?${string}` | `#${string}` | ''}`
        | `/+not-found${`?${string}` | `#${string}` | ''}`
        | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams }
        | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams }
        | { pathname: `/`; params?: Router.UnknownInputParams; }
        | { pathname: `/modal`; params?: Router.UnknownInputParams; }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(auth)'}/login` | `/login`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(auth)'}/signup` | `/signup`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(tabs)'}/dashboard` | `/dashboard`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(tabs)'}/goals` | `/goals`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(tabs)'}/starlog` | `/starlog`; params?: Router.UnknownInputParams; }
        | { pathname: `${'/(tabs)'}/explore` | `/explore`; params?: Router.UnknownInputParams; }
        | { pathname: `/+not-found`, params: Router.UnknownInputParams & {} };
    }
  }
}
