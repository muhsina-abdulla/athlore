module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Lets drizzle's generated migrations.js import its .sql files as strings.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
