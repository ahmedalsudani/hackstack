'use strict';
var gulp = require('gulp');
var bumpVersion = require('gulp-bump');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var beautify = require('gulp-jsbeautifier');
var inject = require('gulp-inject');
var gulpFilter = require('gulp-filter');
var jshint = require('gulp-jshint');
var map = require('map-stream');
var ngAnnotate = require('gulp-ng-annotate');
var del = require('del');
var nodemon = require('gulp-nodemon');
var sequence = require('gulp-sequence');

var moduleFiles = ['./src/**/*.js', '!**/*test.js'];
var allJsFiles = [
  './src/**/*.js',
  './example/client/**/*.js',
  './karma.conf.js',
  './gulpfile.js'
];
var distributionFiles = './dist/app/**/*.js';
var indexTmpl = './dist/app/index.html';
var buildDir = './dist/';
var cleanDirs = ['./dist/*'];
var bowerBuildDir = './bower-angular-hackstack/';

var jsHintErrorReporter = function () {
  return map(function (file, cb) {
    if (!file.jshint.success) {
      process.exit(1);
    }
    cb(null, file);
  });
};

gulp.task('clean', function () {
  del(cleanDirs);
});

gulp.task('copy', function () {
  gulp.src('./example/client/**/*')
    .pipe(gulp.dest('./dist'));

  gulp.src('./example/bower_components/**/*')
    .pipe(gulp.dest('./dist/bower_components'));

  gulp.src('./src/**/*.js')
    .pipe(gulp.dest('./dist/app'));
});

gulp.task('index-dev', ['copy'], function () {

  var filter = gulpFilter(function (file) {
    return !/\.test\.js$/.test(file.path);
  });
  var target = gulp.src(indexTmpl);
  var sources = gulp.src(distributionFiles, {
    read: false
  }).pipe(filter);

  return target.pipe(inject(sources, {
      ignorePath: '/dist',
      addRootSlash: false
    }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('beautify', function () {
  return gulp.src(allJsFiles, {
      base: '.'
    })
    .pipe(beautify({
      config: '.jsbeautifyrc'
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('lint', function () {
  return gulp.src(allJsFiles)
    // '.jshintrc' was a parameter, which lead to jshint not working locally
    // for CD; so removing and seeing if the sky falls for anyone else.
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jsHintErrorReporter());
});

gulp.task('dev', function () {
  nodemon({
      script: 'server/app.js',
      ext: 'html js',
      tasks: ['lint', 'index-dev']
    })
    .on('restart', function () {
      console.log('restarted!');
    });
});

gulp.task('build', function () {
  var normal = gulp.src(moduleFiles)
    .pipe(ngAnnotate())
    .pipe(concat('hackstack.js'))
    .pipe(gulp.dest(buildDir));

  var min = gulp.src(moduleFiles)
    .pipe(ngAnnotate())
    .pipe(concat('hackstack.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest(buildDir));
});

gulp.task('bump-version', function () {
  gulp.src(['./package.json', './bower.json'])
    .pipe(bumpVersion())
    .pipe(gulp.dest('./'));
});

gulp.task('bower:copy-json', function () {
  gulp.src('./bower.json')
    .pipe(gulp.dest(bowerBuildDir));
});

gulp.task('bower:copy-docs', function () {
  gulp.src(['./bower-README.md', 'LICENSE'])
    .pipe(rename(function (path) {
      if (path.basename === 'bower-README') {
        path.basename = 'README';
      }
    }))
    .pipe(gulp.dest(bowerBuildDir));
});

gulp.task('bower:copy-build', function () {
  gulp.src(buildDir + '*.js')
    .pipe(gulp.dest(bowerBuildDir + 'dist/'));
});

gulp.task('bower', sequence(
  'build',
  'bower:copy-json',
  'bower:copy-docs',
  'bower:copy-build'));
