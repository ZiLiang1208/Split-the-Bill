// Minimal manual mock so unit tests can import modules that reference
// react-native (e.g. Platform.OS checks) without pulling in the real
// package, which ships Flow-typed source that plain ts-jest can't parse.
// Jest picks this up automatically for any `import ... from 'react-native'`
// in tests (root-adjacent __mocks__ folder convention, node_modules scope).
module.exports = {
  Platform: {
    OS: 'web',
    select: (obj) => obj.web ?? obj.default,
  },
  Share: {
    share: async () => ({ action: 'sharedAction' }),
    dismissedAction: 'dismissedAction',
    sharedAction: 'sharedAction',
  },
};
