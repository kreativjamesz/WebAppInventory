let mix = require('laravel-mix');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for your Laravel application. By default, we are compiling the Sass
 | file for the application as well as bundling up all the JS files.
 |
 */

mix.js('resources/assets/js/app.js', 'public/js')
   .sass('resources/assets/sass/app.scss', 'public/css')
   .sass('resources/assets/sass/styles.scss', 'public/css');

mix.styles([
    'public/css/bootstrap-table.css',
    'public/css/datepicker.css',
    'public/css/datepicker3.css',
    'public/css/font-awesome.min.css',
    'public/css/styles.css'
], 'public/css/all.css');

mix.scripts([
    'public/js/bootstrap-datepicker.js',
    'public/js/chart.min.js',
    'public/js/chart-data.js',
    'public/js/easypiechart.js',
    'public/js/easypiechart-data.js',
    'public/js/html5shiv.min.js',
    'public/js/lumino.glyphs.js',
    'public/js/respond.min.js',
    // 'public/js/npm.js',
    'public/js/custom.js',
], 'public/js/all.js');