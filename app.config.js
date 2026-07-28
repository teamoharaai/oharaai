const { expo } = require('./app.json');

module.exports = () => {
  const previewRouterRoot = process.env.OHARA_PREVIEW_ROUTER_ROOT;
  if (!previewRouterRoot) return expo;

  return {
    ...expo,
    extra: {
      ...(expo.extra ?? {}),
      router: {
        ...((expo.extra ?? {}).router ?? {}),
        root: previewRouterRoot,
      },
    },
    web: {
      ...expo.web,
      output: 'static',
    },
  };
};
