import Phaser from "phaser";

export const WATER_WOBBLE_FRAG = `
precision mediump float;
uniform sampler2D iChannel0;
uniform float time;
varying vec2 outTexCoord;

void main() {
  vec2 uv = outTexCoord;
  uv.x += sin(uv.y * 8.0 + time * 1.5) * 0.004;
  uv.y += cos(uv.x * 6.0 + time * 1.2) * 0.003;
  gl_FragColor = texture2D(iChannel0, uv);
}
`;

export class WaterWobble extends Phaser.Filters.Controller {
  scene: Phaser.Scene;
  constructor(camera: Phaser.Cameras.Scene2D.Camera, scene: Phaser.Scene) {
    super(camera, "FilterWaterWobble");
    this.scene = scene;
  }
}

export class FilterWaterWobble extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
  constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) {
    super("FilterWaterWobble", manager, undefined, WATER_WOBBLE_FRAG);
  }

  setupUniforms(
    controller: Phaser.Filters.Controller,
    _drawingContext: Phaser.Renderer.WebGL.DrawingContext,
  ): void {
    const wobble = controller as WaterWobble;
    this.programManager.setUniform("time", wobble.scene.time.now / 1000);
  }
}
