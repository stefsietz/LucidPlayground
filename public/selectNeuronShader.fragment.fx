#ifdef GL_ES
    precision highp float;
    precision highp sampler2D;
#endif

varying vec2 vUV;
varying float vIndex;

uniform sampler2D textureSampler;
uniform float widthRes, heightRes;
uniform int hoverIndex;
uniform int selectedIndex;

vec3 redBlue(float brightness);
float getNeuronIndex(vec2 uv);

void main(void) {
  float texVal = texture(textureSampler, vec2(vUV.x, 1.0-vUV.y)).r;
  int idx = int(getNeuronIndex(vUV));
  vec3 col = redBlue(texVal);
  if(texVal == 1000000.0) {
    col = vec3(1.0, 1.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
    return;
  }
  if(idx == hoverIndex){
    col = vec3(0.0, 1.0, 0.0);
  } else if (idx == selectedIndex) {
    col = vec3(1.0, 1.0, 0.0);
  }
  if(idx == hoverIndex && hoverIndex == selectedIndex) {
    col = vec3(0.9, 1.0, 0.5);
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

float getNeuronIndex(vec2 uv) {
    float x = uv.x;
    float y = 1.0-uv.y;

    float neuronWidth = 1.0/float(widthRes);
    float neuronHeight = 1.0/float(heightRes);

    float xIdx = x / neuronWidth;
    float xIdxFloor = floor(xIdx);

    float yIdx = y / neuronHeight;
    float yIdxFloor = floor(yIdx);

    float idx = widthRes * yIdxFloor + xIdxFloor;
    return idx;
  }
