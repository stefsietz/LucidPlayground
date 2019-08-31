#ifdef GL_ES
    precision highp float;
    precision highp sampler2D;
#endif

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform float shift, scale, noise, mean, variance;

vec3 redBlue(float brightness);
float getNeuronIndex(vec2 uv);

void main(void) {
  float texVal = texture(textureSampler, vec2(vUV.x, 1.0-vUV.y)).r;
  texVal -= mean;
  texVal /= variance;
  texVal *= scale;
  texVal += shift;
  vec3 col = redBlue(texVal);
  if(texVal == 1000000.0) {
    col = vec3(1.0, 1.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
    return;
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
