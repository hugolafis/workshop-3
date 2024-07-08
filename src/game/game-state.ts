import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { RenderPipeline } from "./render-pipeline";
import { AssetManager } from "./asset-manager";
import { observable } from "mobx";

export class GameState {
  @observable openingChest = false;

  private renderPipeline: RenderPipeline;
  private clock = new THREE.Clock();

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: OrbitControls;

  private chestPosition = new THREE.Vector3(-0.3, 2.05, 1.9);
  private chestLidOffset = new THREE.Vector3(0, 0.4, -0.3);

  constructor(private assetManager: AssetManager) {
    // Setup the camera and render pipeline first
    this.setupCamera();
    this.renderPipeline = new RenderPipeline(this.scene, this.camera);

    // Add lights and objects to the scene
    this.setupLights();
    this.setupObjects();
    this.scene.background = new THREE.Color("#1680AF");

    // Orbit controls while testing
    this.controls = new OrbitControls(this.camera, this.renderPipeline.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);

    // Start game
    this.update();
  }

  nextChest() {}

  private setupCamera() {
    this.camera.fov = 75;
    this.camera.far = 500;
    this.camera.near = 0.1;
    this.camera.position.set(0, 5, 6.5);
    this.camera.lookAt(0, 3, 0);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(undefined, 0.25);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(undefined, Math.PI);
    directLight.position.copy(new THREE.Vector3(0.75, 1, 0.75).normalize());
    this.scene.add(directLight);
  }

  private setupObjects() {
    const assetManager = this.assetManager;

    const level = assetManager.models.get("level");
    this.scene.add(level);

    const chestBody = assetManager.models.get("chest-body");
    assetManager.applyModelTexture(chestBody, "d1-atlas");
    chestBody.position.copy(this.chestPosition);

    const chestLid = assetManager.models.get("chest-lid");
    assetManager.applyModelTexture(chestLid, "d1-atlas");
    chestLid.position.copy(this.chestPosition).add(this.chestLidOffset);

    this.scene.add(chestBody, chestLid);
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    this.controls.update();

    this.renderPipeline.render(dt);
  };
}
