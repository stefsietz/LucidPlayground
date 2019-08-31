#ifdef GL_ES
    precision highp float;
    precision highp sampler3D;
#endif

uniform sampler3D textureSampler;
uniform int hoverIndex;
uniform int selectedIndex;
uniform float viewWidth, squareWidth, borderWidth;

varying vec2 vUV;
varying float w;
varying float vIndex;
varying vec3 vPos;

const vec3 defaultCol = vec3(0.5, 0.5, 0.5);
const vec3 hoverCol = vec3(0.2, 0.7, 0.0);
const vec3 selectedCol = vec3(1.0, 0.7, 0.0);
const vec3 selectedHoverCol = vec3(0.7, 0.7, 0.0);

vec3 redBlue(float brightness);
float getBorderWidth();

void main(void) {
    float texVal = texture(textureSampler, vec3(vUV.x, -vUV.y, w)).r;
    vec3 col = redBlue(texVal);
    if(texVal == 1000000.0) {
      col = vec3(1.0);
    }
    float bW = 0.5-getBorderWidth();
    if(vPos.x < -bW || vPos.x > bW ||
      vPos.y < -bW || vPos.y > bW ){
      if(vIndex  == float(hoverIndex)){
        col = hoverIndex == selectedIndex ? selectedHoverCol : hoverCol;
      } else if(vIndex  == float(selectedIndex)){
        col = selectedCol;
      } else {
        col = defaultCol;
      }
    }
    gl_FragColor = vec4(col, 1.0);
}

vec3 redBlue(float brightness) {
float r,g,b;
  if(brightness > 0.0){
    r = brightness;
  } else {
    b = -brightness;
  }
  return vec3(r,g,b);
}

float getBorderWidth() {
  float pixelW = 2.0;
  float pixelToScreenCoordLen = 1.0 / (viewWidth / 2.0);
  float sceenToSquareCoordLen = viewWidth / squareWidth;

  return pixelW * pixelToScreenCoordLen * sceenToSquareCoordLen;
}