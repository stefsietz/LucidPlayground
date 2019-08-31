#ifdef GL_ES
    precision highp float;
#endif

// Attributes
attribute vec3 position;

attribute vec2 uv;

attribute vec4 world0;
attribute vec4 world1;
attribute vec4 world2;
attribute vec4 world3;

// Uniforms
uniform mat4 viewProjection;

uniform float viewWidth, viewHeight, squareWidth, margin, channels;

varying vec2 vUV;
varying float w;
varying float vIndex;
varying vec3 vPos;

float getInstanceIndex();

void main(void) {
  mat4 finalWorld = mat4(world0, world1, world2, world3);
  gl_Position = viewProjection * finalWorld * vec4(position, 1.0);
  vUV = uv;
  vPos = position;
  vec4 worldPos = finalWorld * vec4(position*0.09, 1.0);
  vIndex = getInstanceIndex();
  w = (0.5 + vIndex)/channels;
}

float getInstanceIndex() {
    mat4 finalWorld = mat4(world0, world1, world2, world3);
    vec4 worldPos = finalWorld * vec4(position*0.09, 1.0);
    float x = worldPos.x;
    float y = -worldPos.y;

    float xCount = floor((viewWidth - margin) / (squareWidth + margin));
    float widthRatio = squareWidth / (squareWidth+margin);

    float xIdx = (x-margin) / (squareWidth + margin);
    float xIdxFloor = floor(xIdx);

    float yIdx = (y-margin) / (squareWidth + margin);
    float yIdxFloor = floor(yIdx);

    float idx = xCount * yIdxFloor + xIdxFloor;
    return idx;
  }
