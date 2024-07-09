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
  lootObjects: THREE.Object3D[];
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

  private lootPosLeft = new THREE.Vector3(-1, 0.2, 0.45);
  private lootPosMid = new THREE.Vector3(0, 0.2, 0.45);
  private lootPosRight = new THREE.Vector3(1, 0.2, 0.45);
  private lootRevealDuration = 500;

  private mouseNdc = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();

  constructor(private assetManager: AssetManager) {
    // Setup the camera and render pipeline first
    this.setupCamera();
    this.renderPipeline = new RenderPipeline(this.scene, this.camera);

    this.setupLights();
    this.scene.background = new THREE.Color("#1680AF");

    // Object setup
    const level = assetManager.models.get("level");
    this.scene.add(level);

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
    // Cannot generate a new chest whilst current is yet to be opened

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

    const lootNames = ["coins", "hammer-1", "potion-1"];
    const lootObjects: THREE.Object3D[] = [];
    lootNames.forEach((name) => {
      const object = this.assetManager.models.get(name);
      this.assetManager.applyModelTexture(object, "d1-atlas");
      lootObjects.push(object);
    });

    const chest: Chest = {
      rarity,
      lootObjects,
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
      this.openChest();
    }
  };

  private cleanupCurrentChest() {
    if (!this.currentChest) {
      return;
    }

    // Remove the loot objects
  }

  private openChest() {
    if (!this.currentChest) {
      return;
    }

    // Get the chest open anim
    const openDuration = 500;
    const openAnim = chestOpenAnim(this.chestLid, openDuration);

    // Get the loot reveal anims, delay them a bit so lid is half open when they start
    const lootAnimDelay = openDuration * 0.5;
    const lootObjects = this.currentChest.lootObjects;
    const lootRevealAnims = this.getLootRevealAnims(
      lootObjects[0],
      lootObjects[1],
      lootObjects[2]
    );
    lootRevealAnims.forEach((tween) => tween.delay(lootAnimDelay));

    // Loot starts at scale 0, then scales up via another delayed anim
    lootObjects.forEach((object) => object.scale.set(0, 0, 0));
    const lootScaleAnims = this.getLootScaleAnims(
      lootObjects[0],
      lootObjects[1],
      lootObjects[2]
    );
    lootScaleAnims.forEach((tween) => tween.delay(lootAnimDelay));

    // Add the loot to the scene
    this.scene.add(...this.currentChest.lootObjects);

    // Start all the anims
    openAnim.start();
    lootRevealAnims.forEach((tween) => tween.start());
    lootScaleAnims.forEach((tween) => tween.start());
  }

  private getLootRevealAnims(
    leftObject: THREE.Object3D,
    midObject: THREE.Object3D,
    rightObject: THREE.Object3D
  ) {
    // Position them for the start of the animation
    leftObject.position.copy(this.chest.position);
    midObject.position.copy(this.chest.position);
    rightObject.position.copy(this.chest.position);

    // Create a curve path leading to rug pos
    const leftPath = this.getCurvePathTo(this.chest.position, this.lootPosLeft);
    const midPath = this.getCurvePathTo(this.chest.position, this.lootPosMid);
    const rightPath = this.getCurvePathTo(
      this.chest.position,
      this.lootPosRight
    );

    // Return the animations for each object
    const leftAnim = followPathAnim(
      leftObject,
      leftPath,
      this.lootRevealDuration
    );
    const midAnim = followPathAnim(midObject, midPath, this.lootRevealDuration);
    const rightAnim = followPathAnim(
      rightObject,
      rightPath,
      this.lootRevealDuration
    );

    return [leftAnim, midAnim, rightAnim];
  }

  private getCurvePathTo(from: THREE.Vector3, to: THREE.Vector3) {
    // Get the mid point between from and to
    const mid = to.clone().sub(from).multiplyScalar(0.5).add(from);
    mid.y += 2;

    const curve = new THREE.CatmullRomCurve3([from, mid, to]);

    return curve.getPoints(10);
  }

  private getLootScaleAnims(
    leftObject: THREE.Object3D,
    midObject: THREE.Object3D,
    rightObject: THREE.Object3D
  ) {
    const scaleDuration = this.lootRevealDuration * 0.5;
    const leftAnim = scaleAnim(leftObject, scaleDuration);
    const midAnim = scaleAnim(midObject, scaleDuration);
    const rightAnim = scaleAnim(rightObject, scaleDuration);

    return [leftAnim, midAnim, rightAnim];
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

function chestOpenAnim(chestLid: THREE.Object3D, duration: number) {
  // Lid rotates backwards along x axis
  const tween = new TWEEN.Tween(chestLid)
    .to(
      {
        rotation: { x: -Math.PI / 1.5 },
      },
      duration
    )
    .easing(TWEEN.Easing.Bounce.Out);

  return tween;
}

function followPathAnim(
  object: THREE.Object3D,
  path: THREE.Vector3[],
  duration: number
) {
  const stepDuration = duration / path.length;

  // Create the tweens for each waypoint
  const waypointTweens: TWEEN.Tween<THREE.Object3D>[] = [];
  path.forEach((waypoint) => {
    const thisTween = new TWEEN.Tween(object).to(
      {
        position: { x: waypoint.x, y: waypoint.y, z: waypoint.z },
      },
      stepDuration
    );

    waypointTweens.push(thisTween);
  });

  // Chain them all together (go backwards so we end up with the first)
  for (let i = waypointTweens.length - 2; i >= 0; i--) {
    const thisTween = waypointTweens[i];
    const prevTween = waypointTweens[i + 1];

    thisTween.chain(prevTween);
  }

  return waypointTweens[0];
}

function scaleAnim(object: THREE.Object3D, duration: number) {
  const tween = new TWEEN.Tween(object).to(
    {
      scale: { x: 1, y: 1, z: 1 },
    },
    duration
  );

  return tween;
}
