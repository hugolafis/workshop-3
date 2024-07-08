import * as TWEEN from "@tweenjs/tween.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { RenderPipeline } from "./render-pipeline";
import { AssetManager } from "./asset-manager";
import { observable } from "mobx";

/**
 * Flow:
 * - press the Next Chest button
 * - remove previous chest & loot still in scene
 * - generates a new chest and its loot
 * - chest is added to the scene above pedestal
 * - drop animation plays, chest drops onto pedestal
 * - can then interact with the chest (outline on intersect with mouse)
 * - clicking chest plays open animation
 * - loot pops out and falls onto rug
 * - click each loot item (outlined) to make it disappear
 * - left with the empty chest
 */

enum Rarity {
  COMMON = "white",
  UNCOMMON = "green",
  RARE = "blue",
  EPIC = "purple",
  LEGENDARY = "orange",
}

export interface Chest {
  rarity: Rarity;
}

export class GameState {
  currentChest?: Chest;

  private renderPipeline: RenderPipeline;
  private clock = new THREE.Clock();

  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: OrbitControls;

  private chest: THREE.Object3D;
  private chestLid: THREE.Object3D;
  private chestPedestalPosition = new THREE.Vector3(-0.1, 0.65, -1.5);
  private chestLidOffset = new THREE.Vector3(0, 0.4, -0.3);
  private chestDropHeight = 4;

  private mouseNdc = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();

  constructor(private assetManager: AssetManager) {
    // Setup the camera and render pipeline first
    this.setupCamera();
    this.renderPipeline = new RenderPipeline(this.scene, this.camera);

    // Add lights and objects to the scene
    this.setupLights();
    this.setupObjects();
    this.scene.background = new THREE.Color("#1680AF");

    this.chest = assetManager.models.get("chest-body");
    assetManager.applyModelTexture(this.chest, "d1-atlas");

    this.chestLid = assetManager.models.get("chest-lid");
    assetManager.applyModelTexture(this.chestLid, "d1-atlas");

    this.chest.position.copy(this.chestPedestalPosition);
    this.chest.add(this.chestLid);
    this.chestLid.position.copy(this.chestLidOffset);

    // Orbit controls while testing
    this.controls = new OrbitControls(this.camera, this.renderPipeline.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);

    // Start game
    this.update();
  }

  nextChest() {
    // Clear any current chest & loot
    if (this.currentChest) {
      this.currentChest = undefined;
    } else {
      // First time - add chest to the scene
      this.scene.add(this.chest);
    }

    // Generate a new chest & loot
    const rarities = Object.values(Rarity);
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    const chest: Chest = {
      rarity,
    };

    this.currentChest = chest;

    // Setup drop animation

    this.chest.position.y = this.chestDropHeight;
    const dropAnim = chestDropAnim(this.chest, this.chestPedestalPosition);
    dropAnim.onComplete(() => {
      // Add listeners
      window.addEventListener("mousemove", this.onMouseMove);
      window.addEventListener("mousedown", this.onMouseClick);
    });

    dropAnim.start();
  }

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
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    this.controls.update();

    TWEEN.update();

    this.renderPipeline.render(dt);
  };

  private onMouseMove = (e: MouseEvent) => {
    // Set normalised device coords of cursor
    this.mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Raycast into scene to determine if an interactive item was hit
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);

    // Clear any outlines from previous frame
    this.renderPipeline.clearOutlines();

    // First check intersections against the chest
    const intersects = this.raycaster.intersectObject(this.chest);
    if (intersects.length) {
      // Outline the chest
      this.renderPipeline.outlineObject(this.chest);
    }
  };

  private onMouseClick = (e: MouseEvent) => {
    // Determine if clicking on the chest
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const intersects = this.raycaster.intersectObject(this.chest);
    if (intersects.length) {
      console.log("clicked chest");
      this.openChest();
    }
  };

  private openChest() {
    // Start the chest open anim
    const openAnim = chestOpenAnim(this.chestLid);
    openAnim.start();
  }
}

function chestDropAnim(chest: THREE.Object3D, to: THREE.Vector3) {
  const tween = new TWEEN.Tween(chest)
    .to(
      {
        position: { y: to.y },
      },
      500
    )
    .easing(TWEEN.Easing.Circular.In);

  return tween;
}

function chestOpenAnim(chestLid: THREE.Object3D) {
  // Lid rotates backwards along x axis
  const tween = new TWEEN.Tween(chestLid).to(
    {
      rotation: { x: -Math.PI / 2 },
    },
    500
  );

  return tween;
}
