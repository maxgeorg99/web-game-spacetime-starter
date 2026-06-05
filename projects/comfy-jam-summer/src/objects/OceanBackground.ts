import Phaser from "phaser";
import {
  WaterWobble,
  FilterWaterWobble,
} from "../filters/WaterWobbleFilter";

export function createOcean(scene: Phaser.Scene): Phaser.GameObjects.TileSprite {
  const { width, height } = scene.scale;

  const ocean = scene.add.tileSprite(
    width / 2,
    height / 2,
    width,
    height,
    "ocean",
  );

  const renderer = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  if (!renderer.renderNodes.hasNode("FilterWaterWobble")) {
    renderer.renderNodes.addNodeConstructor(
      "FilterWaterWobble",
      FilterWaterWobble as unknown as Function,
    );
  }
  ocean.enableFilters();
  ocean.filters!.internal.add(new WaterWobble(ocean.filterCamera!, scene));

  return ocean;
}
