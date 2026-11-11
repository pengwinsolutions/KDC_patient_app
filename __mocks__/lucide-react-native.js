const React = require('react');

module.exports = new Proxy(
  {},
  {
    get: (_target, name) => {
      if (name === '__esModule') return true;
      return (props) => React.createElement('Icon', { ...props, name });
    },
  },
);
