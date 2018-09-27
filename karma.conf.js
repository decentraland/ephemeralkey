module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai', 'browserify'],
    files: ['src/**/*.ts', 'test/browser/*.js'],
    karmaTypescriptConfig: {
      tsconfig: './tsconfig.json'
    },
    preprocessors: {
      'src/**/*.ts': ['karma-typescript']
    },
    preprocessors: {
      'test/browser/*.js': ['browserify']
    },
    plugins: [
      'karma-mocha',
      'karma-chai',
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-browserify'
    ],
    reporters: ['progress'],
    port: 9876, // karma web server port
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: [
      'ChromeHeadless',
      'Firefox',
      'FirefoxDeveloper',
      'FirefoxNightly'
    ],
    autoWatch: false,
    concurrency: Infinity,
    browserNoActivityTimeout: 999999,
    customLaunchers: {
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['-headless']
      }
    }
  })
}
