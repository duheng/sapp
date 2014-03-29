// 引入 gulp
var gulp = require('gulp'); 

// 引入组件
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var minifyCSS = require('gulp-minify-css');
var jsonminify = require('gulp-jsonminify');


var basepath ="./";
var paths = {
  core: [basepath+'src/sapp.core.js',
    basepath+'src/sapp.plus.fsm.js',
    basepath+'src/sapp.util.js',
    basepath+'src/sapp.plus.timer.js',
    basepath+'src/sjs.min.js',
    basepath+'src/sapp.dao.js',
    basepath+'src/sapp.page.js'],  //按照依赖顺序合并，防止js模块顺序混乱
  plus:[basepath+'src/plus/sapp.plus.slazyload.js',
        basepath+'src/plus/template.all.min.js',
        basepath+'src/plus/sapp.plus.storage.js',
        basepath+'src/plus/iscroll.min.js',
        basepath+'src/plus/sapp.plus.scroll.js',
        basepath+'src/plus/sapp.plus.saop.js',
        basepath+'src/plus/sapp.plus.slider.js',
  ], //扩展模块
  jsons: [basepath+'json/*.json'],
  images: [],
  csss : [basepath+'src/*.css'],
  distjs:basepath+'dist/js',
  distcss:basepath+'dist/css',
  distjson:basepath+'dist/json',
  distimg:basepath+'dist/images',
};

gulp.task('hint',function(){
    return gulp.src(basepath+'src/js/**/*.js')
        .pipe(jshint());
});
gulp.task('core', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src(paths.core)
    .pipe(concat('sapp.js'))
    .pipe(gulp.dest(paths.distjs))
    .pipe(rename('sapp.min.js'))

    .pipe(uglify({outSourceMap: true}))
    .pipe(gulp.dest(paths.distjs));
});
gulp.task('plus', function() {
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src(paths.plus)
    .pipe(concat('sapp.plus.js'))
    .pipe(gulp.dest(paths.distjs))
    .pipe(rename('sapp.plus.min.js'))

    // .pipe(uglify({outSourceMap: true}))
    .pipe(uglify())
    .pipe(gulp.dest(paths.distjs));
});
gulp.task('minify-css', function() {
  return gulp.src(paths.csss)
    .pipe(concat('sapp.css'))
    .pipe(gulp.dest(paths.distcss))
    .pipe(rename('sapp.min.css'))
    .pipe(minifyCSS({'removeEmpty':true}))
    .pipe(gulp.dest(paths.distcss));
});
// Copy all static images
gulp.task('compress-img', function() {
 return gulp.src(paths.images)
    // Pass in options to the task
    .pipe(imagemin({optimizationLevel: 5}))
    .pipe(gulp.dest(paths.distimg));
});
gulp.task('minify-json', function () {
    gulp.src(paths.jsons)
      .pipe(rename(function (path) {
        // path.dirname = "./json/";
        path.basename += ".min";
        // path.extname = ".json"
      }))
      .pipe(jsonminify())
      .pipe(gulp.dest(paths.distjson));
});
// Rerun the task when a file changes
gulp.task('watch', function () {
  gulp.watch(paths.core, ['hint','core']);
  gulp.watch(paths.plus, ['hint','plus']);
  gulp.watch(paths.csss, ['minify-css']);
  gulp.watch(paths.jsons, ['minify-json']);
  // gulp.watch(paths.images, ['compress-img']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['hint','core','plus','minify-css','minify-json', 'watch']);
