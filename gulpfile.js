const {src, dest, parallel, series, watch} = require('gulp');
const sass = require('gulp-sass');
const notify = require('gulp-notify');
const rename = require('gulp-rename');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();
const fileinclude = require('gulp-file-include');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff2 = require('gulp-ttf2woff2');
const fs = require('fs');
const del = require('del');
const webpackStream = require('webpack-stream');
//const webpack = require('webpack');
const uglifyes = require('gulp-uglify-es').default;
const tinypng = require('gulp-tinypng-compress');
const rev = require('gulp-rev');
const revRewrite = require('gulp-rev-rewrite');
const revDel = require('gulp-rev-delete-original');
const htmlmin = require('gulp-htmlmin');

const cb = () => {}

const fontsStyle = (done) => {
    let srcFonts = './src/scss/_fonts.scss';
    let distFonts = './dist/fonts';

    fs.writeFile(srcFonts, '', cb);
    fs.readdir(distFonts, function (err ,items) {
        if (items) {
            let weightFontType = {
                "Thin" : 100,
                "Extra Light" : 200, 
                "Light" : 300, 
                "Regular" : 400,
                "Medium" : 500,
                "Semi Bold" : 600, 
                "Bold" : 700,
                "Extra Bold" : 800, 
                "Black" : 900
            };

            for (let i = 0; i < items.length; i++) {
                let fontnameArr = items[i].split('-');
                let suffixFontname;
                let weight;
                let style = "normal";

                fontname = fontnameArr[0];
                suffixFontname = fontnameArr[1];

                for (const key in weightFontType) {
                    if (suffixFontname.includes(key)) {
                        weight = weightFontType[key];
                    }
                }

                if (suffixFontname.match(/italic/gi)) {
                    style = "italic";
                }

                fs.appendFile(srcFonts, `@include font-face("${fontname}", "${fontname}-${suffixFontname.split('.')[0]}", ${weight}, ${style});\r\n`, cb);

            }
        }
    })

    done();
}

const fonts = () => {
    return src('./src/fonts/**.ttf')
        .pipe(ttf2woff2())
        .pipe(dest('./dist/fonts'));
}

const svgSprites = () => {
    return src('./src/img/svg/**.svg')
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: "../sprite.svg"
                }
            }
        }))
        .pipe(dest('./dist/img'));
}

const styles = () => {
    return src('./src/scss/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', notify.onError))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(cleanCSS({
            level: 2
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest('./dist/css'))
        .pipe(browserSync.stream());
}

const htmlInclude = () => {
    return src(['./src/*.html'])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(dest('./dist'))
        .pipe(browserSync.stream());
}

const imgToDist = () => {
    return src(['./src/img/**.{jpg,jpeg,png}'])
        .pipe(dest('./dist/img'))
}

const resources = () => {
    return src('./src/resources/**')
        .pipe(dest('./dist'));
}

const clean = () => {
    return del(['dist/*'])
}

const scripts = () => {
    return src('./src/js/main.js')
        .pipe(webpackStream({
            output: {
                filename: 'main.js'
            },
            module: {
                rules: [
                  {
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                      loader: 'babel-loader',
                      options: {
                        presets: [
                          ['@babel/preset-env', { targets: "defaults" }]
                        ]
                      }
                    }
                  }
                ]
              }
        }))
        .on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end'); // Don't stop the rest of the task
		})
        .pipe(sourcemaps.init())
        .pipe(uglifyes().on("error", notify.onError()))
        .pipe(sourcemaps.write('.'))
        .pipe(dest('./dist/js'))
        .pipe(browserSync.stream());
}

const cache = () => {
    return src('dist/**/*.{css,js,svg,png,jpg,jpeg,woff2}', {
        base: 'dist'})
        .pipe(rev())
        .pipe(dest('dist'))
        .pipe(revDel())
        .pipe(rev.manifest('rev.json'))
        .pipe(dest('dist'));
};
  
const rewrite = () => {
    const manifest = readFileSync('dist/rev.json');
  
    return src('dist/**/*.html')
        .pipe(revRewrite({
            manifest
        }))
        .pipe(dest('dist'));
}
  
const htmlMinify = () => {
    return src('dist/**/*.html')
        .pipe(htmlmin({
            collapseWhitespace: true
        }))
        .pipe(dest('dist'));
}

const watchFiles = () => {
    browserSync.init({
        server: {
            baseDir: "./dist"
        }
    });

    watch('./src/scss/**/*.scss', styles);
    watch('./src/*.html', htmlInclude);
    watch('./src/html/*.html', htmlInclude);
    watch('./src/img/**.jpg' , imgToDist);
    watch('./src/img/**.jpeg' , imgToDist);
    watch('./src/img/**.png' , imgToDist);
    watch('./src/img/svg/**.svg' , svgSprites);
    watch('./src/fonts/**.ttf', fonts);
    watch('./src/fonts/**.ttf', fontsStyle);
    watch('./src/resources/**', resources);
    watch('./src/js/**/*.js', scripts);
}

exports.cache = series(cache, rewrite);

exports.default = series(clean, parallel (htmlInclude, scripts, fonts, imgToDist, svgSprites, resources), fontsStyle, styles, watchFiles);

const resizetinypng = () => {
    return src(['./src/img/**/*.{jpg,png,jpeg}'])
        .pipe(tinypng({
            key: 'JwPWYVZPHPk3VyWv1m1hLYwPVxRcKMcP',
            parallel: true,
            parallelMax: 50,
            log: true,
        }))
        .pipe(dest('./dist/img'));
}

const stylesBuild = () => {
    return src('./src/scss/**/*.scss')
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', notify.onError))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(cleanCSS({
            level: 2
        }))
        .pipe(dest('./dist/css'));
}

const scriptsBuild = () => {
    return src('./src/js/main.js')
        .pipe(webpackStream({
            output: {
                filename: 'main.js'
            },
            module: {
                rules: [
                  {
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                      loader: 'babel-loader',
                      options: {
                        presets: [
                          ['@babel/preset-env', { targets: "defaults" }]
                        ]
                      }
                    }
                  }
                ]
              }
        }))
        .on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end'); // Don't stop the rest of the task
		})
        .pipe(uglifyes().on("error", notify.onError()))
        .pipe(dest('./dist/js'))
}

exports.build = series(clean, parallel (htmlInclude, scriptsBuild, fonts, imgToDist, svgSprites, resources), fontsStyle, stylesBuild, resizetinypng, htmlMinify);