uniform sampler2D uImage;
uniform float uTime;
uniform vec2 uSize;
uniform vec3 uCursor;

varying vec2 vUv;

#define PI 3.1415926535897932384626433832795


// HELPERS
float clampedSine(float t, float m){
    return (sin(t) + 1.0) * .5 * m;
}

float luminance(vec3 rgb){
    return dot(rgb, vec3(.299, .587, .114));
}

float random(vec2 st){
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float sdCircle(vec2 p, float r){
    return length(p) - r;
}

float sdBox(in vec2 p, in vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, .0)) + min(max(d.x, d.y), .0);
}





void applyMirror (inout vec2 uv){
    uv.x = 1. - uv.x;
}

void applyVerticalSymetry (inout vec2 uv){
    uv.y = abs(uv.y - .5) + .5;
}

void applyRotation (inout vec2 uv, float r) {
    uv -= .5;
    float a = atan(uv.x, uv.y);

    a -= r;
    uv = vec2(cos(a), sin(a)) * length(uv);
    uv += .5;
}

void applyZoom(inout vec2 uv, float z) {
    uv -= .5;
    uv *= 1. / z;
    uv += .5;
}

void applyFishEye(inout vec2 uv, float s){
    uv -= .5;

    // uv += atan(uv.x, uv.y);
    float l = length(uv);
    uv *= smoothstep(0., s * .5,l);

    uv += .5;
}

void applyRepeat(inout vec2 uv, float x, float y){
    uv.x *= x;
    uv.y *= y;
    uv = fract(uv);
}

void applyVerticalWave(inout vec2 uv, float s){
    // multiplier a l'intérieur du sin = fréquence
    // multiplier a l'extérieur du sin = amplitude
    uv.x += sin(uv.y * s + uTime) * .005;
}

void applyVerticlalRows(inout vec2 uv){
    uv.x += sin((floor(uv.y * 5.) / 70.) * 50. + uTime * 10.) * .05;
}

void applyFold(inout vec2 uv, float s){
    uv -= .5;

    uv.y += abs(uv.x) * s;

    uv += .5;
}

void applyVerticalClamp(inout vec2 uv, float lb, float lh){
    uv.y = clamp(uv.y, lb, lh);
}

void applyPixel(inout vec2 uv, float s){
    // 0 correspond au Level of Detail (0 correpond au l'image en elle même)
    vec2 pix = vec2(s) / vec2(textureSize(uImage,0));
    uv = floor(uv / pix) * pix;
}

void applyTwist(inout vec2 uv, float s){
    uv -= .5;
    float l = 1. - length(uv);
    float a = atan(uv.x, uv.y);

    a += l*s;
    uv = vec2(cos(a), sin(a)) * length(uv);
    uv += .5;
}

void applyRandomPixelate(inout vec2 uv, float p, float s){

    vec2 pix = vec2(p) / vec2(textureSize(uImage,0));
    uv.x += (-1. + random(floor(uv / pix) * pix) * 2.) * s;
    uv.y += (-1. + random(floor(uv / pix) * pix) * 2.) * s;
}

void applyScan(inout vec2 uv){
    // uv.x += (random(uv.yy) * 2. -1.) * s;
    uv.x += (random(uv.yy) * 2. -1.) * smoothstep(0., 1., sin(uv.y * 5. - uTime * 2.));
}

void applyGlass(inout vec2 uv, float s){
    uv += (random(uv) * 2. -1.) * s;
}

void applyCRT(inout vec2 uv, float s, float dir){
    // sign renvois -1 quand on lui donne un nombre négatif et 1 quand on lui donne un nombre positif et 0 quand on lui donne 0
    // uv -= .5;

    // uv.x += sign(sin(abs(uv.y) * 1000.) * uTime) * s;
    float crt = sin(abs((uv.y + dir) * 1000.));
    uv.x += sign(crt) * s;

    // uv += .5;
}

void applyBlackWhite(inout vec4 c){
    c = vec4(vec3(luminance(c.rgb)), c.a);
}

void applyBlack(inout vec4 c, float limit){
    c.rgb = vec3(step(limit, luminance(c.rgb)));
}

void applyDrawColors(inout vec4 c, float s){
    // s is the number of colors to draw
    c = ceil(c * s) / s;
}

void applySonar(inout vec4 c, vec2 uv){
    uv -= .5;

    float l = length(uv);
    l *= 100.;
    l -= uTime * 10.;
    l = sin(l);
    l = smoothstep(-1., -.9, l);

    c.rgb *= l * vec3(0., 1., 0.5);

    uv += .5;
}

void applyGrid(inout vec4 c, vec2 uv){
    
    c *= .5 + .5 * smoothstep(1., .9, sin(uv.y * 200.));
    c *= .5 + .5 * smoothstep(1., .9, sin(uv.x * 200.));
}

void applyHorrizontalWaves(inout vec4 c, vec2 uv){
    
    c *= smoothstep(1., .9, sin(uv.y * 200. + sin(uv.x * 40.) * 2.));
}

void applyNegativeCircle(inout vec4 c, vec2 uv, vec2 coord, float r) {
    coord += .5;
    uv -= coord;

    float circle = step(sdCircle(uv, r), 0.);

    // mix postive and negative with the circle mask :
    c.rgb = mix(
        c.rgb, // positive
        1. - c.rgb, // negative
        circle
    );

    uv += coord;
}

void applyNegativeBox(inout vec4 c, vec2 uv, vec2 box, vec2 coord) {
    coord += .5; // define base coord to center
    uv -= coord;

    float circle = step(sdBox(uv, box), 0.);
    // mix postive and negative with the circle mask :
    c.rgb = mix(
        1. - c.rgb, 
        c.rgb, 
        circle
    ); 

    uv += coord;
}

void applyChromaticAberration(inout vec4 col, vec2 uv, float radius, float angle) {
    vec2 uvR = vec2(cos(angle), sin(angle)) * radius;
    angle += PI;
    vec2 uvG = vec2(cos(angle), sin(angle)) * radius;
    angle += PI;
    vec2 uvB = vec2(cos(angle), sin(angle)) * radius;
    col.r = texture2D(uImage, uv + uvR).r;
    col.g = texture2D(uImage, uv + uvG).g;
    col.b = texture2D(uImage, uv + uvB).b;
}

void applyColorSplit(inout vec2 uv){
    vec4 col = texture2D(uImage, uv);
    float a = PI * 2. * luminance(col.rgb) + uTime;
    uv += vec2(cos(a), sin(a)) * .05;
}


void main() {
    vec2 uv = vUv;
    vec2 cursor = uCursor.xy;

    /**
    * UV
    */
    // applyMirror(uv);
    // applyVerticalSymetry(uv);
    // applyRotation(uv, -.45);
    // applyZoom(uv, 1.5);
    // applyFishEye(uv, 1.5 + sin(uTime));
    // applyRepeat(uv, 3., 3.);
    // applyVerticalWave(uv, 30.);
    // applyVerticlalRows(uv);
    // applyFold(uv, clampedSine(uTime, .5));
    // applyVerticalClamp(uv, .2 - clampedSine(uTime, .5), .8 + clampedSine(uTime, .5));
    // applyPixel(uv, 5. + clampedSine(uTime, .5));
    // applyPixel(uv, 5.);
    // applyTwist(uv, 2. - clampedSine(uTime, .5));
    // applyRandomPixelate(uv, 2. + clampedSine(uTime + PI, .6), clampedSine(uTime, .2));
    // applyScan(uv);
    // applyGlass(uv, .01);
    // applyCRT(uv, .01, uTime * .01);
    applyColorSplit(uv);

    vec4 col = texture2D(uImage, uv);

    /**
    * COLOR
    */
    // applyBlackWhite(col);
    // applyBlack(col, .5);
    // applyDrawColors(col, 5.);
    // applySonar(col, uv);
    // applyGrid(col, uv);
    // applyHorrizontalWaves(col, uv);
    // applyNegativeCircle(col, uv, vec2(cos(uTime) * .3, sin(uTime) * .3), .05 + clampedSine(uTime, .2));
    // applyNegativeCircle(col, uv, cursor, .2);
    // applyNegativeBox(col, uv, vec2(.25), vec2(0.);
    // applyChromaticAberration(col, uv, .01, 0.);


    gl_FragColor = col;
}