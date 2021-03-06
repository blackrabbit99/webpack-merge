'use strict';

var isArray = Array.isArray;
var isPlainObject = require('lodash.isplainobject');
var merge = require('lodash.merge');
var find = require('lodash.find');

var loaderNameRe = new RegExp(/[a-z\-]/ig);

function mergeLoaders(currentLoaders, newLoaders) {
  return newLoaders.reduce(function (mergedLoaders, loader) {
    if (mergedLoaders.every(function (l) {
      return loader.match(loaderNameRe)[0] !== l.match(loaderNameRe)[0];
    })) {
      return mergedLoaders.concat([loader]);
    }
    return mergedLoaders;
  }, currentLoaders);
}

function reduceLoaders(mergedLoaderConfigs, loaderConfig) {
  var foundLoader = find(mergedLoaderConfigs, function (l) {
    return String(l.test) === String(loaderConfig.test);
  });

  if (foundLoader) {
    if (foundLoader.include && loaderConfig.include || foundLoader.exclude) {
      return mergedLoaderConfigs.concat([loaderConfig]);
    }

    // foundLoader.loader is intentionally ignored, because a string loader value should always override
    if (foundLoader.loaders) {
      var newLoaders = loaderConfig.loader ? [loaderConfig.loader] : loaderConfig.loaders || [];

      foundLoader.loaders = mergeLoaders(foundLoader.loaders, newLoaders);
    }

    if (loaderConfig.include) {
      foundLoader.include = loaderConfig.include;
    }

    if (loaderConfig.exclude) {
      foundLoader.exclude = loaderConfig.exclude;
    }

    return mergedLoaderConfigs;
  }

  return mergedLoaderConfigs.concat([loaderConfig]);
}

function joinArrays(customizer, a, b, key) {
  if (isArray(a) && isArray(b)) {
    var customResult = customizer(a, b, key);

    if (!b.length) {
      return [];
    }

    if (customResult) {
      return customResult;
    }

    if (isLoader(key)) {
      return b.concat(a);
    }

    return a.concat(b);
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    if (!Object.keys(b).length) {
      return {};
    }

    return merge({}, a, b, joinArrays.bind(null, customizer));
  }

  return b;
}

module.exports = function () {
  var args = Array.prototype.slice.call(arguments);

  return merge.apply(null, [{}].concat(args).concat([joinArrays.bind(null, function () {})]));
};

module.exports.smart = function webpackMerge() {
  var args = Array.prototype.slice.call(arguments);

  return merge.apply(null, [{}].concat(args).concat([joinArrays.bind(null, function (a, b, key) {
    if (isLoader(key)) {
      return a.reduce(reduceLoaders, b.slice());
    }
  })]));
};

function isLoader(key) {
  return ['loaders', 'preLoaders', 'postLoaders'].indexOf(key) >= 0;
}